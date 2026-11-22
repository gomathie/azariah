# Azaria marketing

## Ad video

`azaria-ad.mp4` is a 30-second vertical ad (1080 × 1920) for WhatsApp status, Instagram, TikTok and Facebook. It has no sound yet.

The source is in `ad-video/`, built with Remotion.

```
cd marketing/ad-video
npm install
npx remotion studio          # preview and edit
npx remotion render AzariaAd out/azaria-ad.mp4
```

### Script

| Time | On screen |
|---|---|
| 0–4s | How much did your shop make today? If you have to guess, you are losing money. |
| 4–8s | Sound familiar? The notebook gets lost. Customer debts get forgotten. Cash and MoMo get mixed up. |
| 8–11s | Azaria. Record Today. Grow Tomorrow. |
| 11–15.5s | See all your money in one place. Cash, Mobile Money and bank. |
| 15.5–19.5s | Record a sale in seconds. Sales and expenses kept apart. |
| 19.5–23.5s | Know exactly who owes you. Part payments and WhatsApp reminders. |
| 23.5–26.5s | Works without internet. Your records stay private. English, Français and Twi. Reports as PDF or Excel. |
| 26.5–30s | Know your business. Grow your business. Start with Azaria today. |

The amounts shown are sample figures. Every claim is something the app does today. The video names no price and no web address; add them in `ad-video/src/Composition.tsx` once they are decided.

Remotion is free for individuals and for companies of up to three people. Larger companies need a licence: https://www.remotion.dev/docs/license
