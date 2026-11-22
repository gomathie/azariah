// One-off edit of script.json: gives the English voice lines the punctuation and wording that
// make a neural voice deliver them like an advert, and keeps clean text for the captions.
//
// How the voice reads punctuation:
//   ?    lifts the pitch at the end, a real question
//   !    more energy and a firmer landing
//   ,    a short breath, used to set up the word that follows
//   ...  a held pause, used before the line that should hit
//   short sentences land with more confidence than long ones
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'script.json')
const script = JSON.parse(fs.readFileSync(file, 'utf8'))

const english = {
  hook: { say: "How much did your shop make, today? If you have to guess... you're losing money.", caption: "How much did your shop make today? If you have to guess, you're losing money.", speed: 1.0 },
  problem: { say: 'The notebook gets lost. Customer debts? Forgotten. Cash and mobile money, all mixed up.', caption: 'The notebook gets lost. Customer debts? Forgotten. Cash and Mobile Money, all mixed up.', speed: 1.1 },
  brand: { say: 'Meet Azaria! Record today. Grow tomorrow.', caption: 'Meet Azaria! Record today. Grow tomorrow.', speed: 1.0 },
  money: { say: 'See all your money, in one place. Cash, mobile money, and bank. Always up to date.', caption: 'See all your money in one place. Cash, Mobile Money and bank. Always up to date.', speed: 1.08 },
  record: { say: 'Record a sale in seconds! And keep your sales and expenses apart.', caption: 'Record a sale in seconds! And keep your sales and expenses apart.', speed: 1.08 },
  daybook: { say: 'Every entry, day by day. Money in... and money out.', caption: 'Every entry, day by day. Money in, and money out.', speed: 1.06 },
  debts: { say: 'Know exactly who owes you. And send a reminder, in one tap!', caption: 'Know exactly who owes you. And send a reminder in one tap!', speed: 1.08 },
  reports: { say: 'Clear reports, as P D F, or Excel.', caption: 'Clear reports, as PDF or Excel.', speed: 1.06 },
  trust: { say: 'It works without internet. And your records stay private.', caption: 'It works without internet. And your records stay private.', speed: 1.04 },
  close: { say: 'Know your business. Grow your business! Start with Azaria, today.', caption: 'Know your business. Grow your business! Start with Azaria today.', speed: 1.02 },
}
for (const scene of script.en) Object.assign(scene, english[scene.id] ?? {})

// Twi: the voice model takes its tones from the spelling, and it knows only letters, so the
// levers are commas and full stops. Commas are added where a speaker would breathe.
const twi = {
  hook: 'Sika ahe, na wo sotɔɔ nyae ɛnnɛ? Sɛ wonnim a, wo sika reyera.',
  debts: 'Hu wɔn a wɔde wo ka, pɛpɛɛpɛ. Na soma nkaebɔ, ntɛm.',
  record: 'Kyerɛw adetɔn, ntɛm ara. Na ma adetɔn ne ɛka, ntetew mu.',
  trust: 'Ɛyɛ adwuma, a intanɛt nni hɔ mpo. Na wo nsɛm, yɛ kokoam.',
  close: 'Hu wo adwuma. Ma wo adwuma nyin. Fi ase ne Asaria, ɛnnɛ.',
}
for (const scene of script.tw) {
  if (twi[scene.id]) {
    if (!scene.caption) scene.caption = scene.say
    scene.say = twi[scene.id]
  }
}
fs.writeFileSync(file, JSON.stringify(script, null, 2) + '\n')
console.log('script updated')
