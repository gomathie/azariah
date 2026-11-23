# Azaria brag plan (full workflow, Hyperframes)

Run on 2026-11-23 with `/brag --full --format vertical`, voice kept at the owner's request. Two cuts from one layout and one timing: English and Twi, 1080 × 1920, 30 fps, 20.6 seconds.

## Planning rubric

1. **What is it?** A bookkeeping app for small shops, used on the phone.
2. **Who is it for?** Shop owners and traders in Ghana who keep records in a notebook or not at all.
3. **What does it do for them?** Shows what the shop made, where the money is and who owes.
4. **What sets it apart?** It works without internet, speaks English, French and Twi, and uses plain words.
5. **Strongest claim:** "Know exactly who owes you."
6. **Visual hook:** a till figure that will not settle, beside the question "How much did your shop make today?"
7. **Real UI to show:** Home (money available), Add sale, Customers (who owes), Reports (PDF and Excel buttons).
8. **Tone:** `app-store`, quick. Freeform direction from the owner: not boring, a real advert's pace.
9. **Share caption:** see `share-copy.txt`.

## Angle

One phone stays on screen while four real screens slide through it, the way the app itself moves. One claim per screen. The question opens it; the brand answers it.

## Storyboard

| # | Scene | Start | Length | On screen | Sound |
|---|---|---|---|---|---|
| 1 | Hook | 0.00 | 2.46 | Question word by word; till figure spinning | Voice; music bed |
| 2 | Brand | 2.46 | 1.64 | Teal opens from the question badge; mark lands; "Meet Azaria." | Drop on the cut |
| 3 | Money | 4.10 | 2.18 | Phone rises; Home screen; amber ring on "Money available" | Voice |
| 4 | Record | 6.28 | 2.45 | Add sale slides in and scrolls | Voice |
| 5 | Debts | 8.73 | 2.20 | Customers slides in; amber ring on the customer who owes | Voice |
| 6 | Reports | 10.93 | 2.71 | Reports slides in and scrolls to the PDF and Excel buttons | Voice |
| 7 | Trust | 13.64 | 2.18 | Night opens from the centre; no-internet icon; "Your records stay private" | Voice |
| 8 | Close | 15.82 | 4.78 | Ground floods teal; mark, name, tagline; button lands at 18.01 | Click on the button |

## Music cue guidance

Track: "Happy Beats / Business Moves Vol. 10", about 110 beats a minute, cue preset bundled with the skill. Every scene cut is on a beat of its grid. Beat-locked moments: the brand reveal at 2.46 s, the close at 15.82 s (strong cue) and the button at 18.01 s (strong cue). Music sits at 0.2 under the voice and fades over the last second.

Audio-reactive treatment: none. The extraction helper was not run; skipped so as not to block the render.

## Voiceover script

English (Kokoro, voice `am_michael`, speed 1.3): How much did your shop make today? / Meet Azaria! / All your money, in one place. / Record a sale in seconds. / Know exactly who owes you. / Reports, as PDF or Excel. / It works without internet. / Record today. Grow tomorrow! Start with Azaria, today.

Twi (Meta MMS Akan, sped up 1.25 times, pitch kept): the matching lines in `ad-video/src/brag.json`. Kokoro has no Twi voice, so the voice files made earlier for both languages are reused here instead of `hyperframes tts`.

## Grounding

Every claim is something the app does today. The names and phone numbers on the Customers screen are sample records from the local demo shop. The spinning till figure is decoration, not a claim.

## Credits and licence

Music: Sascha Ende, ende.app (CC BY 4.0). The credit must travel with the video wherever it is posted. Sound effects: Kenney.nl (CC0).
