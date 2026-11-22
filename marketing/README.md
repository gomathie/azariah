# Azaria marketing

## Ad videos

| File | Language | Length | Use |
|---|---|---|---|
| `azaria-ad-english-short.mp4` | English | 41 seconds | Paid ads and status posts |
| `azaria-ad-english.mp4` | English | 68 seconds | Page posts, WhatsApp groups, demos |
| `azaria-ad-twi-short.mp4` | Twi | 39 seconds | Paid ads and status posts |
| `azaria-ad-twi.mp4` | Twi | 66 seconds | Page posts, WhatsApp groups, demos |

All are vertical (1080 × 1920). Each has a voice-over, captions, background music, icons and illustrations, and real screenshots of the app with sample data.

### Why they look the way they do

A short review of current advice on vertical video ads, applied here:

- **The hook is on screen in the first second.** The opening question, a market stall and the Azaria mark appear at once. Platforms judge an ad largely on whether people watch past three seconds.
- **Every spoken line is also a caption.** Most people in a feed watch with the sound off.
- **Words stay clear of the app's own buttons.** Nothing important sits in the top 270 or bottom 660 pixels, or within 100 pixels of the sides. Sources disagree on the exact figures, so these are the cautious ones. Preview on a real phone before paying to promote.
- **A short cut exists.** Most guidance puts the best length at 15 to 30 seconds. The short cuts are about 40 seconds, set by the pace of the voice. A human voice-over could bring them under 30.
- **The brand is never off screen**, and a thin line across the top shows how much is left.

### How they are made

The source is in `ad-video/`, built with Remotion.

| Path | What it holds |
|---|---|
| `src/script.json` | Per language and scene: the headline, the spoken line (`say`), the caption, the icon and the screenshot. `short` lists the scenes in the short cut. |
| `src/Composition.tsx` | The scenes, captions, safe area, music and timing. |
| `src/Art.tsx` | The icons, the market stall, the coin, the flame and the moving background. All drawn in code. |
| `src/durations.json` | The length of each voice file. A scene lasts that long plus a short pause. |
| `public/shots/` | App screenshots, one set per language. |
| `public/voice/` | One voice file per scene and language. |
| `public/audio/` | The background music and the transition sound. |
| `scripts/` | The scripts that made the music and the voices. |

```
cd marketing/ad-video
npm install
npx remotion studio                                              # preview and edit
npx remotion render AzariaAdEnglishShort out/azaria-ad-english-short.mp4
npx remotion render AzariaAdEnglish      out/azaria-ad-english.mp4
npx remotion render AzariaAdTwiShort     out/azaria-ad-twi-short.mp4
npx remotion render AzariaAdTwi          out/azaria-ad-twi.mp4
```

### The sound

- **English voice:** Kokoro, an open neural voice run on this computer (`am_michael`). The name is spoken "Ah-Zah-ria". The lines in `script.json` are punctuated for delivery: a question mark lifts the pitch, an exclamation mark adds energy, a comma is a short breath, and three dots hold a pause before the line that should land. Each scene has its own `speed`.
- **Twi voice:** Meta's open MMS speech model for Akan, run on this computer. It takes its tones from the spelling and offers no control beyond commas and full stops. The model has no letter "z", so the name is spoken "Asaria". Nobody who speaks Twi has checked the wording or listened to it.
- **Music:** written in code by `scripts/make-music.mjs`, so it is original and free to use anywhere. It is a light groove in C major at 104 beats a minute, kept well under the voice, lifting for the last scene.
- **Nobody has listened to these files.** They were made by a tool that cannot hear. Play each one before posting.

To use a recorded human voice, replace the files in `public/voice/` with the same names, update `durations.json` with their lengths in seconds, and render again. The voice scripts need `kokoro-js`, `onnxruntime-node` and `wavefile`, which are not in this project's `package.json`.

### What the ads say

1. How much did your shop make today? If you have to guess, you're losing money.
2. The notebook gets lost. Customer debts? Forgotten. Cash and Mobile Money, all mixed up.
3. Meet Azaria! Record today. Grow tomorrow.
4. See all your money in one place.
5. Record a sale in seconds.
6. Every entry, day by day.
7. Know exactly who owes you.
8. Clear reports, as PDF or Excel.
9. It works without internet. And your records stay private.
10. Know your business. Grow your business! Start with Azaria today.

The short cuts use lines 1, 3, 4, 7, 9 and 10.

Every claim is something the app does today. The amounts are sample figures. The ads name no price and no web address; add them to `script.json` once they are decided.

Remotion is free for individuals and for companies of up to three people. Larger companies need a licence: https://www.remotion.dev/docs/license
