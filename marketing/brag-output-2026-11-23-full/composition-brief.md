# Hyperframes Composition Brief: Azaria

## Objective
A short launch-style brag video for Azaria, in English and in Twi.

## Output
- Composition directories: `en/` and `tw/` (both written by `work/build.mjs`)
- Rendered videos: `azaria-brag-english.mp4`, `azaria-brag-twi.mp4`
- Format: vertical, 1080x1920, 30 fps
- Duration: 20.6 seconds

## Source Material
- Project root: the Azaria repository
- Words: `marketing/ad-video/src/brag.json`
- Screens: `marketing/ad-video/public/shots/` (real screenshots, sample data)
- Product name: Azaria. Tagline: "Record today. Grow tomorrow."
- Copy that must appear verbatim: each scene's `line` in `brag.json`

## Creative Direction
- Tone preset: app-store. Direction: a real advert's pace, not boring.
- Hook: "How much did your shop make today?"
- Outro: "Record today. Grow tomorrow." and "Start with Azaria today"
- Avoid: generic SaaS language, abstract filler, any redesign of the app's screens.

## Visual Identity
- Teal `#0f766e`, deep teal `#0b3b37`, amber `#fbbf24`, ink `#0f172a`, paper `#f1f5f9`
- Font: Inter (bundled), weights 700 and 900

## Storyboard
See `brag-plan.md`.

## Audio
- Role: warm bed under a voice. Music at 0.2, one-second fade out.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`; cuts on its beat grid.
- SFX: a soft drop on the brand reveal, a click when the button lands. Nothing else.
- Voice: one file per scene, starting 0.12 s after its cut.
- Audio-reactive treatment: none (extraction not run).

## Implementation notes
- One root composition per language, scenes as timed clips. `hyperframes check` passes with no errors; it warns that scenes should be sub-compositions, which was left as is to keep both languages in one generator.
- Remaining warnings: five centred lines sit inside TikTok's widest right-edge margin.
