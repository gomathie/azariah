// English voice-over with Kokoro, an open neural voice that runs on this computer.
// It sounds far more like a person than the voice built into Windows.
import fs from 'node:fs'
import path from 'node:path'
import { KokoroTTS } from 'kokoro-js'
import wavefile from 'wavefile'

const VIDEO = process.argv[2]
const VOICE = process.argv[3] ?? 'am_michael'
const script = JSON.parse(fs.readFileSync(path.join(VIDEO, 'src/script.json'), 'utf8'))
const outDir = path.join(VIDEO, 'public/voice')
const durationsFile = path.join(VIDEO, 'src/durations.json')
const durations = JSON.parse(fs.readFileSync(durationsFile, 'utf8'))
durations.en = {}

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })

// The owner says the name "Ah-Zah-ria". The spelling below is for the voice only; the screen says Azaria.
const spoken = (text) => text.replace(/Azaria/g, 'Ahzahria')

for (const scene of script.en) {
  // Sentence by sentence, with a measured pause between, gives a steadier and more assured delivery.
  const parts = scene.say.split(/(?<=[.?!])\s+/).filter(Boolean)
  const chunks = []
  let rate = 24000
  for (const part of parts) {
    const audio = await tts.generate(spoken(part), { voice: VOICE, speed: scene.speed ?? 1.06 })
    rate = audio.sampling_rate
    chunks.push(Float32Array.from(audio.audio))
    chunks.push(new Float32Array(Math.round(rate * 0.18)))
  }
  chunks.pop()
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const joined = new Float32Array(total)
  let at = 0
  for (const c of chunks) {
    joined.set(c, at)
    at += c.length
  }
  let peak = 0
  for (const v of joined) peak = Math.max(peak, Math.abs(v))
  const gain = peak > 0 ? 0.9 / peak : 1
  const pcm = Int16Array.from(joined, (v) => Math.max(-32768, Math.min(32767, Math.round(v * gain * 32767))))
  const wav = new wavefile.WaveFile()
  wav.fromScratch(1, rate, '16', pcm)
  fs.writeFileSync(path.join(outDir, `en-${scene.id}.wav`), wav.toBuffer())
  durations.en[scene.id] = Number((joined.length / rate).toFixed(2))
}
fs.writeFileSync(durationsFile, JSON.stringify(durations, null, 2) + '\n')
console.log('voice', VOICE, JSON.stringify(durations.en))
