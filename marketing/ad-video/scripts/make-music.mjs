// Writes the ad's background music and transition sound. Everything is synthesised here from
// plain maths, so the track is original and free to use anywhere. No downloads, no licence.
//
//   node scripts/make-music.mjs
//
// Style: a light, warm, forward-moving groove in C major at 104 beats a minute, with a plucked
// lead that nods to highlife guitar lines, a soft pad, a round bass, a kick and a shaker.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 44100
const BPM = 104
const BEAT = 60 / BPM
const BARS = 36 // about 83 seconds, longer than any cut of the ad
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio')
fs.mkdirSync(out, { recursive: true })

const total = Math.ceil(BARS * 4 * BEAT * RATE)
const left = new Float32Array(total)
const right = new Float32Array(total)
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)

/** Adds one note. `shape` gives the sound at time t (seconds since the note began). */
function note(start, length, shape, gain = 1, pan = 0) {
  const from = Math.floor(start * RATE)
  const count = Math.floor(length * RATE)
  const l = gain * Math.cos(((pan + 1) * Math.PI) / 4)
  const r = gain * Math.sin(((pan + 1) * Math.PI) / 4)
  for (let i = 0; i < count && from + i < total; i++) {
    const v = shape(i / RATE, length)
    left[from + i] += v * l
    right[from + i] += v * r
  }
}

const pluck = (f) => (t) => {
  const env = Math.exp(-t * 7.5) * Math.min(1, t * 400)
  return env * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 12) + 0.12 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 18))
}
const pad = (f) => (t, len) => {
  const env = Math.min(1, t / 0.5) * Math.min(1, (len - t) / 0.6)
  return env * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.004 * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t)) * 0.5
}
const bass = (f) => (t, len) => {
  const env = Math.min(1, t * 120) * Math.exp(-t * 2.2) * Math.min(1, (len - t) * 40)
  return env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t))
}
const kick = (t) => Math.exp(-t * 16) * Math.sin(2 * Math.PI * (48 + 90 * Math.exp(-t * 30)) * t)
let seed = 7
const noise = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 2147483648 - 1
}
let lastNoise = 0
const shaker = (t) => {
  const n = noise()
  const high = n - lastNoise // a simple high-pass, so the shaker is bright and thin
  lastNoise = n
  return Math.exp(-t * 34) * high * 0.5
}

// C  G  Am  F, two bars each. Chords as MIDI notes; lead lines as scale steps over each chord.
const chords = [
  { root: 48, tones: [60, 64, 67], lead: [72, 76, 79, 76, 84, 79, 76, 79] },
  { root: 43, tones: [59, 62, 67], lead: [74, 79, 83, 79, 86, 83, 79, 74] },
  { root: 45, tones: [60, 64, 69], lead: [72, 76, 81, 76, 84, 81, 76, 72] },
  { root: 41, tones: [60, 65, 69], lead: [72, 77, 81, 77, 84, 81, 77, 72] },
]

for (let bar = 0; bar < BARS; bar++) {
  const chord = chords[Math.floor(bar / 2) % chords.length]
  const t0 = bar * 4 * BEAT
  const intro = bar < 2
  const full = bar >= 4

  for (const tone of chord.tones) note(t0, 4 * BEAT + 0.3, pad(hz(tone)), 0.11, (tone % 3) * 0.3 - 0.3)

  // Bass: a syncopated figure, the push on the "and" of two gives the forward lean.
  if (!intro) {
    for (const [beat, len] of [[0, 1.2], [1.5, 0.5], [2.5, 0.9], [3.5, 0.5]]) {
      note(t0 + beat * BEAT, len * BEAT, bass(hz(chord.root)), 0.34)
    }
  }
  // Plucked lead in eighth notes, with every other bar leaving room.
  for (let step = 0; step < 8; step++) {
    if (intro && step % 2 === 1) continue
    if (bar % 2 === 1 && (step === 3 || step === 6)) continue
    const accent = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.8 : 0.62
    note(t0 + step * 0.5 * BEAT, 0.7, pluck(hz(chord.lead[step])), 0.17 * accent, step % 2 === 0 ? -0.35 : 0.35)
  }
  if (full) {
    for (const beat of [0, 2]) note(t0 + beat * BEAT, 0.35, kick, 0.5)
    note(t0 + 2.75 * BEAT, 0.3, kick, 0.28)
  }
  if (!intro) {
    for (let step = 0; step < 8; step++) {
      note(t0 + (step * 0.5 + 0.25) * BEAT, 0.12, shaker, step % 2 === 0 ? 0.32 : 0.2, 0.5)
    }
  }
}

function writeWav(file, l, r) {
  let peak = 0
  for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]))
  const gain = peak > 0 ? 0.85 / peak : 1
  const data = Buffer.alloc(l.length * 4)
  for (let i = 0; i < l.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i] * gain)) * 32767), i * 4)
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i] * gain)) * 32767), i * 4 + 2)
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
  fs.writeFileSync(file, Buffer.concat([head, data]))
}

// A short fade in so the track does not click on.
for (let i = 0; i < RATE * 0.4; i++) {
  left[i] *= i / (RATE * 0.4)
  right[i] *= i / (RATE * 0.4)
}
writeWav(path.join(out, 'music.wav'), left, right)

// Transition sound: a soft rising swish with a small pluck at the end. Used at each scene change.
const n = Math.floor(RATE * 0.42)
const sl = new Float32Array(n)
const sr = new Float32Array(n)
let prev = 0
for (let i = 0; i < n; i++) {
  const t = i / RATE
  const x = t / 0.42
  const raw = noise()
  // The filter opens as the sound goes on, which is what makes it seem to rise.
  prev += (raw - prev) * (0.04 + 0.5 * x * x)
  const swish = prev * Math.sin(Math.PI * x) ** 2 * 0.7
  const tick = t > 0.3 ? Math.exp(-(t - 0.3) * 40) * Math.sin(2 * Math.PI * 1320 * (t - 0.3)) * 0.5 : 0
  sl[i] = swish * (1 - x * 0.5) + tick
  sr[i] = swish * (0.5 + x * 0.5) + tick
}
writeWav(path.join(out, 'swish.wav'), sl, sr)
console.log('music seconds', (total / RATE).toFixed(1), '| written to', out)
