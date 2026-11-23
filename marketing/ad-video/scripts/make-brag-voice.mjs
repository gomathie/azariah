// Voice lines for the short "brag" cuts, read from src/brag.json.
//
//   node make-brag-voice.mjs <path to ad-video> en [english speed]
//   node make-brag-voice.mjs <path to ad-video> tw
// One language per run: the two voice libraries cannot be loaded in the same process.
//
// English: Kokoro, at an advert's pace (1.3 by default). Files go straight to public/voice/brag-en-<id>.wav.
// Twi: Meta's MMS Akan model, which has no speed control. It writes public/voice/brag-tw-<id>.raw.wav,
// and ffmpeg then speeds those up without changing the pitch (see marketing/README.md).
// Silence at the start and end of every line is trimmed so the voice starts on the cut.
// Needs kokoro-js, onnxruntime-node and wavefile, so run it from a folder that has them installed.
import fs from 'node:fs'
import path from 'node:path'
import wavefile from 'wavefile'

const VIDEO = process.argv[2]
const LANG = process.argv[3] ?? 'en'
const EN_SPEED = Number(process.argv[4] ?? 1.3)
const script = JSON.parse(fs.readFileSync(path.join(VIDEO, 'src/brag.json'), 'utf8'))
const outDir = path.join(VIDEO, 'public/voice')

function join(chunks) {
  const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.length
  }
  return all
}

function save(file, audio, rate) {
  let peak = 0
  for (const v of audio) peak = Math.max(peak, Math.abs(v))
  // Trim to the first and last sample that is clearly sound, keeping a few milliseconds either side.
  const floor = peak * 0.02
  let first = 0
  let last = audio.length - 1
  while (first < last && Math.abs(audio[first]) < floor) first++
  while (last > first && Math.abs(audio[last]) < floor) last--
  const keep = Math.round(rate * 0.03)
  const cut = audio.subarray(Math.max(0, first - keep), Math.min(audio.length, last + keep * 3))
  const gain = peak > 0 ? 0.9 / peak : 1
  const pcm = Int16Array.from(cut, (v) => Math.max(-32768, Math.min(32767, Math.round(v * gain * 32767))))
  const wav = new wavefile.WaveFile()
  wav.fromScratch(1, rate, '16', pcm)
  fs.writeFileSync(file, wav.toBuffer())
  return (cut.length / rate).toFixed(2)
}

if (LANG === 'en') {
const { KokoroTTS } = await import('kokoro-js')
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
for (const scene of script.en) {
  const parts = scene.say.replace(/Azaria/g, 'Ahzahria').split(/(?<=[.?!])\s+/).filter(Boolean)
  const chunks = []
  let rate = 24000
  for (const part of parts) {
    const audio = await tts.generate(part, { voice: 'am_michael', speed: EN_SPEED })
    rate = audio.sampling_rate
    chunks.push(Float32Array.from(audio.audio), new Float32Array(Math.round(rate * 0.06)))
  }
  console.log('en', scene.id, save(path.join(outDir, `brag-en-${scene.id}.wav`), join(chunks), rate))
}

} else {
const ort = (await import('onnxruntime-node')).default
const cache = path.resolve('aka-model')
const vocab = JSON.parse(fs.readFileSync(path.join(cache, 'vocab.json'), 'utf8'))
const config = JSON.parse(fs.readFileSync(path.join(cache, 'config.json'), 'utf8'))
const tokCfg = JSON.parse(fs.readFileSync(path.join(cache, 'tokenizer_config.json'), 'utf8'))
const rate = config.sampling_rate ?? 16000
const pad = vocab[tokCfg.pad_token ?? '<pad>'] ?? 0
const session = await ort.InferenceSession.create(path.join(cache, 'model.onnx'))
for (const scene of script.tw) {
  const parts = scene.say.split(/(?<=[.?!])\s+/).filter(Boolean)
  const chunks = []
  for (const part of parts) {
    const ids = [pad]
    for (const char of part.replace(/[.?!,]/g, (m) => (m in vocab ? m : ' ')).toLowerCase().normalize('NFC')) {
      if (char in vocab) ids.push(vocab[char], pad)
    }
    const result = await session.run({
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      attention_mask: new ort.Tensor('int64', BigInt64Array.from(ids.map(() => 1n)), [1, ids.length]),
    })
    chunks.push(Float32Array.from(result[session.outputNames[0]].data), new Float32Array(Math.round(rate * 0.08)))
  }
  console.log('tw', scene.id, save(path.join(outDir, `brag-tw-${scene.id}.raw.wav`), join(chunks), rate))
}
}
