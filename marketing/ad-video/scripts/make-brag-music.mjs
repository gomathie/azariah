// Music and sound effects for the short "brag" cuts, written as one piece per language.
//
//   node scripts/make-brag-music.mjs
//
// 1. Measures each voice line (public/voice/brag-<lang>-<id>.wav) and writes src/brag-durations.json.
// 2. Works out the scene lengths with the same rule as src/Brag.tsx: every cut is on a beat.
// 3. Writes public/audio/brag-music-<lang>.wav at 120 beats a minute in C major, with a soft swish
//    and a chime in key on each cut, all on the one beat grid counted from the first frame.
// Everything is synthesised here, so it is original and free to use anywhere.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = JSON.parse(fs.readFileSync(path.join(root, 'src/brag.json'), 'utf8'))
const FPS = 30
const BEAT_FRAMES = 15 // 120 beats a minute
const RATE = 44100
const BEAT = BEAT_FRAMES / FPS
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)

function wavSeconds(file) {
  const b = fs.readFileSync(file)
  let at = 12
  let byteRate = 0
  while (at + 8 <= b.length) {
    const id = b.toString('ascii', at, at + 4)
    const size = b.readUInt32LE(at + 4)
    if (id === 'fmt ') byteRate = b.readUInt32LE(at + 16)
    if (id === 'data') return Math.min(size, b.length - at - 8) / byteRate
    at += 8 + size + (size % 2)
  }
  throw new Error('no data chunk in ' + file)
}

/** Same rule as sceneFrames in src/Brag.tsx. */
const sceneFrames = (seconds, id) => Math.max(id === 'brand' ? 45 : 60, Math.ceil(((seconds + 0.2) * FPS) / BEAT_FRAMES) * BEAT_FRAMES)

const durations = {}
for (const lang of ['en', 'tw']) {
  durations[lang] = {}
  for (const scene of script[lang]) {
    durations[lang][scene.id] = Number(wavSeconds(path.join(root, `public/voice/brag-${lang}-${scene.id}.wav`)).toFixed(2))
  }
}
fs.writeFileSync(path.join(root, 'src/brag-durations.json'), JSON.stringify(durations, null, 2) + '\n')

let seed = 7
const noise = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 2147483648 - 1
}

const chords = [
  { root: 48, tones: [60, 64, 67], lead: [72, 76, 79, 76, 84, 79, 76, 79] },
  { root: 43, tones: [59, 62, 67], lead: [74, 79, 83, 79, 86, 83, 79, 74] },
  { root: 45, tones: [60, 64, 69], lead: [72, 76, 81, 76, 84, 81, 76, 72] },
  { root: 41, tones: [60, 65, 69], lead: [72, 77, 81, 77, 84, 81, 77, 72] },
]

for (const lang of ['en', 'tw']) {
  const frames = script[lang].map((scene) => sceneFrames(durations[lang][scene.id], scene.id))
  const cuts = []
  let at = 0
  for (const f of frames) {
    cuts.push(at / FPS)
    at += f
  }
  const seconds = at / FPS
  const closeStart = cuts[cuts.length - 1]
  const total = Math.ceil(seconds * RATE)
  const left = new Float32Array(total)
  const right = new Float32Array(total)

  const note = (start, length, shape, gain = 1, pan = 0) => {
    const from = Math.floor(start * RATE)
    const count = Math.floor(length * RATE)
    const l = gain * Math.cos(((pan + 1) * Math.PI) / 4)
    const r = gain * Math.sin(((pan + 1) * Math.PI) / 4)
    for (let i = 0; i < count; i++) {
      if (from + i < 0 || from + i >= total) continue
      const v = shape(i / RATE, length)
      left[from + i] += v * l
      right[from + i] += v * r
    }
  }
  const pluck = (f) => (t) =>
    Math.exp(-t * 7.5) * Math.min(1, t * 400) * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 12))
  const pad = (f) => (t, len) =>
    Math.min(1, t / 0.3) * Math.min(1, (len - t) / 0.4) * 0.5 * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.004 * t) + 0.25 * Math.sin(4 * Math.PI * f * t))
  const bass = (f) => (t, len) =>
    Math.min(1, t * 120) * Math.exp(-t * 2.6) * Math.min(1, (len - t) * 40) * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t))
  const kick = (t) => Math.exp(-t * 16) * Math.sin(2 * Math.PI * (48 + 90 * Math.exp(-t * 30)) * t)
  let lastNoise = 0
  const shaker = (t) => {
    const n = noise()
    const high = n - lastNoise
    lastNoise = n
    return Math.exp(-t * 34) * high * 0.5
  }
  // A soft bell in key: the chime that lands on each cut.
  const chime = (f) => (t) => Math.exp(-t * 5) * Math.min(1, t * 300) * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 9))
  // Filtered noise that opens up and stops on the cut.
  let prev = 0
  const swish = (t, len) => {
    const x = t / len
    prev += (noise() - prev) * (0.03 + 0.4 * x * x)
    return prev * x * x * Math.min(1, (len - t) * 60)
  }

  const bars = Math.ceil(seconds / (4 * BEAT))
  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[bar % chords.length]
    const t0 = bar * 4 * BEAT
    const intro = t0 < cuts[1] // the hook plays over pad and a sparse lead only
    const lift = t0 >= closeStart - 0.01
    for (const tone of chord.tones) note(t0, 4 * BEAT + 0.2, pad(hz(tone)), lift ? 0.14 : 0.1, (tone % 3) * 0.3 - 0.3)
    for (let step = 0; step < 8; step++) {
      const t = t0 + step * 0.5 * BEAT
      const drums = t >= cuts[1] - 0.01
      if (intro && !drums && step % 2 === 1) continue
      const accent = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.8 : 0.6
      note(t, 0.6, pluck(hz(chord.lead[step])), (lift ? 0.2 : 0.15) * accent, step % 2 === 0 ? -0.35 : 0.35)
      if (!drums) continue
      if (step % 2 === 0) note(t, 0.3, kick, step % 4 === 0 ? 0.5 : 0.36)
      note(t + 0.25 * BEAT, 0.1, shaker, step % 2 === 0 ? 0.26 : 0.16, 0.5)
      if (step === 0 || step === 3 || step === 5) note(t, (step === 0 ? 1.2 : 0.6) * BEAT, bass(hz(chord.root)), 0.34)
    }
  }
  // Effects on the cuts, in the key of the bar they land in.
  cuts.forEach((cut, i) => {
    if (i === 0) return
    const chord = chords[Math.floor(cut / (4 * BEAT)) % chords.length]
    note(cut - 0.3, 0.3, swish, 0.2, 0)
    note(cut, 1.2, chime(hz(chord.tones[2] + 12)), i === cuts.length - 1 ? 0.16 : 0.1, i % 2 === 0 ? -0.2 : 0.2)
  })

  let peak = 0
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
  const gain = 0.85 / peak
  const fadeIn = RATE * 0.05
  const fadeOut = RATE * 0.7
  const data = Buffer.alloc(total * 4)
  for (let i = 0; i < total; i++) {
    const env = Math.min(1, i / fadeIn, (total - i) / fadeOut)
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * gain * env)) * 32767), i * 4)
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * gain * env)) * 32767), i * 4 + 2)
  }
  const head = Buffer.alloc(44)
  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVEfmt ', 8)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(2, 22)
  head.writeUInt32LE(RATE, 24)
  head.writeUInt32LE(RATE * 4, 28)
  head.writeUInt16LE(4, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  fs.writeFileSync(path.join(root, `public/audio/brag-music-${lang}.wav`), Buffer.concat([head, data]))
  console.log(lang, 'seconds', seconds, '| scene frames', frames.join(' '))
}
