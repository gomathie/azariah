# Azaria marketing

## Ad videos

| File | Language | Length |
|---|---|---|
| `azaria-ad-english.mp4` | English | about 60 seconds |
| `azaria-ad-twi.mp4` | Twi | about 62 seconds |

Both are vertical (1080 × 1920) for WhatsApp status, Instagram, TikTok and Facebook. Each has a voice-over, words on screen, and real screenshots of the app with sample data.

### How they are made

The source is in `ad-video/`, built with Remotion.

- `ad-video/src/script.json` holds the words on screen and the words spoken, per language and per scene.
- `ad-video/public/shots/` holds the app screenshots, one set per language.
- `ad-video/public/voice/` holds one voice file per scene.
- `ad-video/src/durations.json` holds how long each voice file is. Each scene lasts that long plus a short pause.

```
cd marketing/ad-video
npm install
npx remotion studio                                         # preview and edit
npx remotion render AzariaAdEnglish out/azaria-ad-english.mp4
npx remotion render AzariaAdTwi out/azaria-ad-twi.mp4
```

### The voices

- **English** is the voice built into Windows (Microsoft Zira). It is clear but sounds like a computer.
- **Twi** is Meta's open MMS speech model for Akan, run on this computer. Nobody who speaks Twi has listened to it or checked the wording. The model has no letter "z", so the name is spoken as "Asaria".

For a version you will pay to promote, record a person reading `script.json` and replace the files in `public/voice/` (same file names), then update `durations.json` and render again.

### What the ads say

1. How much did your shop make today? If you have to guess, you are losing money.
2. The notebook gets lost. Customer debts get forgotten. Cash and Mobile Money get mixed up.
3. Azaria. Record Today. Grow Tomorrow.
4. See all your money in one place.
5. Record a sale in seconds.
6. Every entry, day by day.
7. Know exactly who owes you.
8. Clear reports as PDF or Excel.
9. Works without internet. Your records stay private. English, Français and Twi.
10. Know your business. Grow your business. Start with Azaria today.

Every claim is something the app does today. The amounts are sample figures. The ads name no price and no web address; add them to `script.json` once they are decided.

Remotion is free for individuals and for companies of up to three people. Larger companies need a licence: https://www.remotion.dev/docs/license
