// Twi voice-over with Meta's MMS Akan model, run directly with ONNX Runtime.
// The model is a VITS network: characters in, waveform out. Its tokenizer is a character table
// with a blank token between every character.
import fs from 'node:fs'
import path from 'node:path'
import ort from 'onnxruntime-node'
import wavefile from 'wavefile'

const VIDEO = process.argv[2]
const REPO = 'https://huggingface.co/onnx-community/mms-tts-aka-ONNX/resolve/main/'
const cache = path.resolve('aka-model')
fs.mkdirSync(cache, { recursive: true })
for (const file of ['onnx/model.onnx', 'vocab.json', 'config.json', 'tokenizer_config.json']) {
  const target = path.join(cache, path.basename(file))
  if (!fs.existsSync(target)) {
    const res = await fetch(REPO + file)
    if (!res.ok) throw new Error(`download ${file}: ${res.status}`)
    fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()))
  }
}
const vocab = JSON.parse(fs.readFileSync(path.join(cache, 'vocab.json'), 'utf8'))
const config = JSON.parse(fs.readFileSync(path.join(cache, 'config.json'), 'utf8'))
const tokCfg = JSON.parse(fs.readFileSync(path.join(cache, 'tokenizer_config.json'), 'utf8'))
const rate = config.sampling_rate ?? 16000
const pad = vocab[tokCfg.pad_token ?? '<pad>'] ?? 0
console.log('sampling rate', rate, '| vocab size', Object.keys(vocab).length, '| pad id', pad, '| add_blank', tokCfg.add_blank)

const unknown = new Set()
function tokenize(text) {
  const ids = []
  for (const char of text.toLowerCase().normalize('NFC')) {
    if (char in vocab) ids.push(vocab[char])
    else if (char !== '\n') unknown.add(char)
  }
  // Blank token before, between and after the characters, as VITS expects.
  const out = [pad]
  for (const id of ids) out.push(id, pad)
  return out
}

const session = await ort.InferenceSession.create(path.join(cache, 'model.onnx'))
console.log('model inputs', session.inputNames, 'outputs', session.outputNames)

const script = JSON.parse(fs.readFileSync(path.join(VIDEO, 'src/script.json'), 'utf8'))
const outDir = path.join(VIDEO, 'public/voice')
const durationsFile = path.join(VIDEO, 'src/durations.json')
const durations = fs.existsSync(durationsFile) ? JSON.parse(fs.readFileSync(durationsFile, 'utf8')) : { en: {}, tw: {} }
durations.tw = {}

for (const scene of script.tw) {
  // Synthesise sentence by sentence and join with a short pause; the model is steadier on short input.
  const parts = scene.say.split(/(?<=[.?!])\s+/).filter(Boolean)
  const chunks = []
  for (const part of parts) {
    const ids = tokenize(part.replace(/[.?!,]/g, (m) => (m in vocab ? m : ' ')))
    const feeds = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      attention_mask: new ort.Tensor('int64', BigInt64Array.from(ids.map(() => 1n)), [1, ids.length]),
    }
    const result = await session.run(feeds)
    chunks.push(Float32Array.from(result[session.outputNames[0]].data))
    chunks.push(new Float32Array(Math.round(rate * 0.28)))
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const audio = new Float32Array(total)
  let at = 0
  for (const c of chunks) {
    audio.set(c, at)
    at += c.length
  }
  // Normalise so both languages play at a similar level.
  let peak = 0
  for (const v of audio) peak = Math.max(peak, Math.abs(v))
  const gain = peak > 0 ? 0.9 / peak : 1
  const pcm = Int16Array.from(audio, (v) => Math.max(-32768, Math.min(32767, Math.round(v * gain * 32767))))
  const wav = new wavefile.WaveFile()
  wav.fromScratch(1, rate, '16', pcm)
  fs.writeFileSync(path.join(outDir, `tw-${scene.id}.wav`), wav.toBuffer())
  durations.tw[scene.id] = Number((audio.length / rate).toFixed(2))
}
fs.writeFileSync(durationsFile, JSON.stringify(durations, null, 2) + '\n')
console.log('characters the model does not know:', [...unknown].join(' ') || 'none')
console.log(JSON.stringify(durations.tw))
