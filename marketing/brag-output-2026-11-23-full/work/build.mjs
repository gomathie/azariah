// Writes the Hyperframes composition for each language (en/index.html, tw/index.html) and copies
// the assets each one needs. The words come from ad-video/src/brag.json, so both languages share
// one layout and one timing.
//
//   node work/build.mjs <path to the brag skill folder>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const video = path.join(out, '..', 'ad-video')
const skill = process.argv[2]
const script = JSON.parse(fs.readFileSync(path.join(video, 'src/brag.json'), 'utf8'))
const seconds = JSON.parse(fs.readFileSync(path.join(video, 'src/brag-durations.json'), 'utf8'))

// Cuts sit on the beat grid of the bundled track (cue preset for "Happy Beats / Business Moves Vol. 10").
const T = { hook: 0, brand: 2.46, money: 4.1, record: 6.28, debts: 8.73, reports: 10.93, trust: 13.64, close: 15.82, cta: 18.01, end: 20.6 }
const MUSIC = 'happy-beats-business-moves-vol-10-by-ende-dot-app.mp3'
const SFX = ['interface/drop_002.ogg', 'interface/click_001.ogg']
const ICONS = {
  wallet: ['M3.5 7.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M3.5 7.5l11-3.5v3.5', 'M16.5 13.5h.01'],
  tag: ['M4 12.5 11.5 5H19v7.5L11.5 20z', 'M15 9h.01'],
  people: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5', 'M16 4.3a3.5 3.5 0 0 1 0 6.4', 'M18 14.8c2 .7 3.5 2.4 3.5 5.2'],
  chart: ['M4.5 20V4', 'M4.5 20h15', 'M8.5 16v-4', 'M12.5 16V8', 'M16.5 16v-6'],
  wifiOff: ['M3 3l18 18', 'M5 12.5a10 10 0 0 1 4-2.6', 'M15 9.9a10 10 0 0 1 4 2.6', 'M8.5 16a5 5 0 0 1 7 0', 'M2 9a15 15 0 0 1 4.5-3', 'M12 5a15 15 0 0 1 10 4', 'M12 19.5h.01'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3', 'M12 15v2'],
  question: ['M8.5 9a3.5 3.5 0 1 1 5.6 2.8c-1.2.9-2.1 1.5-2.1 3.2', 'M12 18.5h.01'],
}
const icon = (name, size, color, stroke = 1.9) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name].map((d) => `<path d="${d}"/>`).join('')}</svg>`
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const words = (text, cls) => text.split(' ').map((w) => `<span class="${cls}">${esc(w)}</span>`).join(' ')

function page(lang) {
  const s = Object.fromEntries(script[lang].map((scene) => [scene.id, scene]))
  const shots = ['money', 'record', 'debts', 'reports']
  const K = 608 / 1170 // screenshot pixels to phone-screen pixels
  const voice = Object.keys(T)
    .filter((id) => s[id])
    .map((id) => `      <audio id="vo-${id}" class="clip" data-start="${(T[id] + 0.12).toFixed(2)}" data-duration="${(seconds[lang][id] - 0.01).toFixed(2)}" data-track-index="5" data-volume="1" src="assets/voice/${id}.wav"></audio>`)
    .join('\n')
  return `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'ak'}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root { --teal: #0f766e; --teal-dark: #115e59; --deep: #0b3b37; --soft: #ccfbf1; --amber: #fbbf24; --ink: #0f172a; --paper: #f1f5f9; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--deep); }
      #root { position: relative; width: 100%; height: 100%; font-family: Inter, sans-serif; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .fill { position: absolute; inset: 0; }
      .tag { position: absolute; top: 290px; left: 120px; display: flex; align-items: center; gap: 16px; font-size: 40px; font-weight: 900; }
      .tag img { width: 64px; height: 64px; border-radius: 16px; }
      .w, .cw { display: inline-block; }

      #hook-q { position: absolute; top: 400px; left: 120px; right: 210px; font-size: 112px; line-height: 1.08; font-weight: 900; letter-spacing: -2px; color: #fff; }
      #hook-till { position: absolute; top: 1000px; left: 120px; width: 780px; padding: 44px 50px; border-radius: 44px; background: #15514c; border: 3px solid #2f6f69; display: flex; align-items: center; justify-content: space-between; }
      #hook-amount { font-size: 104px; font-weight: 900; color: var(--amber); font-variant-numeric: tabular-nums; }
      #hook-badge { width: 120px; height: 120px; border-radius: 60px; background: var(--amber); display: flex; align-items: center; justify-content: center; }

      #brand-flood { background: var(--teal); }
      #brand-stack { position: absolute; top: 540px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 56px; }
      #brand-logo { width: 340px; height: 340px; border-radius: 84px; box-shadow: 0 30px 80px rgba(0,0,0,0.3); }
      #brand-line { font-size: 100px; font-weight: 900; letter-spacing: -3px; color: #fff; }

      #app-paper { background: var(--paper); }
      .hl { position: absolute; top: 390px; left: 120px; right: 190px; display: flex; align-items: center; gap: 28px; }
      .hl .badge { flex: none; width: 124px; height: 124px; border-radius: 62px; background: var(--teal); display: flex; align-items: center; justify-content: center; }
      .hl h2 { font-size: 72px; line-height: 1.08; font-weight: 900; letter-spacing: -1.5px; color: var(--ink); }
      #phone { position: absolute; left: 220px; top: 730px; width: 640px; height: 1280px; border-radius: 72px; background: var(--ink); padding: 16px; box-shadow: 0 50px 120px rgba(15,23,42,0.4); }
      #phone-glass { position: relative; width: 100%; height: 100%; border-radius: 58px; overflow: hidden; background: #f8fafc; }
      .screen { position: absolute; inset: 0; overflow: hidden; background: #f8fafc; }
      .screen img { display: block; width: 100%; }
      .ring { position: absolute; border: 8px solid var(--amber); border-radius: 30px; box-shadow: 0 0 0 2000px rgba(15,23,42,0.28); }

      #trust-night { background: var(--deep); }
      #trust-stack { position: absolute; top: 470px; left: 210px; right: 210px; display: flex; flex-direction: column; align-items: center; gap: 56px; }
      #trust-badge { width: 300px; height: 300px; border-radius: 150px; background: var(--soft); display: flex; align-items: center; justify-content: center; }
      #trust-line { font-size: 88px; line-height: 1.08; font-weight: 900; letter-spacing: -2px; color: #fff; text-align: center; }
      #trust-pill { display: flex; align-items: center; gap: 20px; padding: 22px 40px; border-radius: 999px; background: #1d5650; border: 2px solid #3a7a73; font-size: 36px; font-weight: 700; color: #fff; }

      #close-flood { background: var(--teal); }
      #close-stack { position: absolute; top: 320px; left: 210px; right: 210px; display: flex; flex-direction: column; align-items: center; gap: 54px; }
      #close-logo { width: 210px; height: 210px; border-radius: 62px; box-shadow: 0 30px 80px rgba(0,0,0,0.3); }
      #close-name { font-size: 76px; font-weight: 900; color: #fff; }
      #close-line { font-size: 88px; line-height: 1.08; font-weight: 900; letter-spacing: -2px; color: #fff; text-align: center; }
      #close-cta { padding: 30px 54px; border-radius: 999px; background: var(--amber); color: var(--ink); font-size: 44px; font-weight: 900; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
      #bar { position: absolute; top: 0; left: 0; width: 1080px; height: 10px; background: var(--amber); transform-origin: left center; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="1080" data-height="1920">
      <div id="s-hook" class="clip scene" data-start="0" data-duration="${T.brand}" data-track-index="0" data-track-kind="graphics" style="z-index: 1; background: var(--deep)">
        <div class="tag" style="color: #fff"><img src="assets/azaria-icon.png" alt="" />Azaria</div>
        <div id="hook-q">${words(s.hook.line, 'w hw')}</div>
        <div id="hook-till"><span id="hook-amount">GH₵0,000</span><div id="hook-badge">${icon('question', 84, '#0f172a', 2.6)}</div></div>
      </div>

      <div id="s-brand" class="clip scene" data-start="${T.brand}" data-duration="${(T.money - T.brand).toFixed(2)}" data-track-index="0" data-track-kind="graphics" style="z-index: 2; background: var(--deep)">
        <div id="brand-flood" class="fill"></div>
        <div id="brand-stack"><img id="brand-logo" src="assets/azaria-icon.png" alt="" /><div id="brand-line">${esc(s.brand.line)}</div></div>
      </div>

      <div id="s-app" class="clip scene" data-start="${T.money}" data-duration="${(T.trust - T.money).toFixed(2)}" data-track-index="0" data-track-kind="graphics" style="z-index: 3; background: var(--teal)">
        <div id="app-paper" class="fill"></div>
        <div class="tag" style="color: var(--teal-dark)"><img src="assets/azaria-icon.png" alt="" />Azaria</div>
${shots.map((id) => `        <div id="hl-${id}" class="hl" data-layout-allow-overlap><div class="badge">${icon(s[id].icon, 72, '#fff')}</div><h2 data-layout-allow-overlap>${esc(s[id].line)}</h2></div>`).join('\n')}
        <div id="phone" data-layout-allow-overflow><div id="phone-glass">
${shots.map((id) => `          <div id="sc-${id}" class="screen" data-layout-ignore><img id="img-${id}" src="assets/shots/${s[id].shot}.png" alt="" /></div>`).join('\n')}
          <div id="ring-money" class="ring" style="left: ${Math.round(48 * K - 8)}px; top: ${Math.round(243 * K - 8)}px; width: ${Math.round(1074 * K + 16)}px; height: ${Math.round(600 * K + 16)}px"></div>
          <div id="ring-debts" class="ring" style="left: ${Math.round(50 * K - 8)}px; top: ${Math.round(425 * K - 8)}px; width: ${Math.round(1070 * K + 16)}px; height: ${Math.round(206 * K + 16)}px"></div>
        </div></div>
      </div>

      <div id="s-trust" class="clip scene" data-start="${T.trust}" data-duration="${(T.close - T.trust).toFixed(2)}" data-track-index="0" data-track-kind="graphics" style="z-index: 4; background: var(--paper)">
        <div id="trust-night" class="fill"></div>
        <div class="tag" style="color: #fff"><img src="assets/azaria-icon.png" alt="" />Azaria</div>
        <div id="trust-stack">
          <div id="trust-badge">${icon('wifiOff', 180, '#115e59')}</div>
          <div id="trust-line">${esc(s.trust.line)}</div>
          <div id="trust-pill">${icon('lock', 56, '#fbbf24')}<span>${esc(s.trust.sub)}</span></div>
        </div>
      </div>

      <div id="s-close" class="clip scene" data-start="${T.close}" data-duration="${(T.end - T.close).toFixed(2)}" data-track-index="0" data-track-kind="graphics" style="z-index: 5; background: var(--deep)">
        <div id="close-flood" class="fill"></div>
        <div id="close-stack">
          <img id="close-logo" src="assets/azaria-icon.png" alt="" />
          <div id="close-name">Azaria</div>
          <div id="close-line">${words(s.close.line, 'cw')}</div>
          <div id="close-cta">${esc(s.close.cta)}</div>
        </div>
      </div>

      <div id="s-bar" class="clip" data-start="0" data-duration="${T.end}" data-track-index="1" data-track-kind="graphics" data-layout-ignore style="z-index: 9; position: absolute; top: 0; left: 0"><div id="bar"></div></div>

      <audio id="music" class="clip" data-start="0" data-duration="${T.end}" data-track-index="3" data-volume="0.2" data-fade-in="0.1" data-fade-out="1" src="assets/music/${MUSIC}"></audio>
      <audio id="sfx-drop" class="clip" data-start="${T.brand}" data-duration="0.19" data-track-index="4" data-volume="0.5" src="assets/sfx/interface/drop_002.ogg"></audio>
      <audio id="sfx-click" class="clip" data-start="${T.cta}" data-duration="0.1" data-track-index="4" data-volume="0.5" src="assets/sfx/interface/click_001.ogg"></audio>
${voice}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const T = ${JSON.stringify(T)};
      const blurIn = (target, at, extra = {}) => tl.fromTo(target, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.18, ease: "power4.out", ...extra }, at);
      const blurOut = (target, at) => tl.to(target, { opacity: 0, filter: "blur(8px)", duration: 0.13, ease: "power2.in" }, at);

      tl.fromTo("#bar", { scaleX: 0 }, { scaleX: 1, duration: T.end, ease: "none" }, 0);

      // Hook: the question arrives word by word; the till cannot settle on a figure.
      tl.fromTo(".hw", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.13, stagger: 0.067, ease: "power4.out" }, 0.05);
      tl.fromTo("#hook-till", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, 0.3);
      const amount = document.getElementById("hook-amount");
      tl.to({ v: 0 }, { v: 1, duration: T.brand - 0.3, ease: "none", onUpdate() {
        const n = Math.floor(this.progress() * 30);
        amount.textContent = "GH₵" + (((n * 7919 + 137) % 9000) + 100).toLocaleString("en-US");
      } }, 0.3);
      tl.to("#hook-q", { opacity: 0, filter: "blur(8px)", duration: 0.13, ease: "power2.in" }, T.brand - 0.14);

      // Brand: teal opens from the question badge. beat-locked: 2.46s
      tl.fromTo("#brand-flood", { clipPath: "circle(0% at 74% 56%)" }, { clipPath: "circle(150% at 74% 56%)", duration: 0.4, ease: "power2.inOut" }, T.brand);
      tl.fromTo("#brand-logo", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, T.brand + 0.08);
      blurIn("#brand-line", T.brand + 0.28);
      tl.to("#brand-stack", { opacity: 0, scale: 1.12, duration: 0.16, ease: "power3.in" }, T.money - 0.17);

      // The app: one phone, four screens. The paper rises with the phone; screens slide like app pages.
      tl.fromTo("#app-paper", { yPercent: 100 }, { yPercent: 0, duration: 0.4, ease: "power2.inOut" }, T.money);
      tl.fromTo("#phone", { y: 700, rotation: 5 }, { y: 0, rotation: 0, duration: 0.6, ease: "expo.out" }, T.money + 0.05);
      const shots = ["money", "record", "debts", "reports"];
      shots.forEach((id, i) => {
        const at = T[id];
        const next = shots[i + 1] ? T[shots[i + 1]] : T.trust;
        // beat-grid: money 4.10s, record 6.28s, debts 8.73s, reports 10.93s
        if (i === 0) {
          tl.set("#sc-" + id, { xPercent: 0, opacity: 1 }, 0);
        } else {
          tl.fromTo("#sc-" + id, { xPercent: 100 }, { xPercent: 0, duration: 0.3, ease: "power3.out" }, at);
          tl.fromTo("#sc-" + shots[i - 1], { xPercent: 0 }, { xPercent: -30, duration: 0.3, ease: "power3.out", immediateRender: false }, at);
        }
        blurIn("#hl-" + id, at + (i === 0 ? 0.3 : 0.12));
        if (shots[i + 1]) blurOut("#hl-" + id, next - 0.14);
      });
      tl.set(".hl", { opacity: 0 }, 0);
      tl.fromTo("#ring-money", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.35, ease: "expo.out" }, T.money + 0.75);
      tl.to("#ring-money", { opacity: 0, duration: 0.12 }, T.record - 0.12);
      tl.fromTo("#img-record", { y: 0 }, { y: -170, duration: 1.6, ease: "power2.inOut" }, T.record + 0.55);
      tl.fromTo("#ring-debts", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.35, ease: "expo.out" }, T.debts + 0.5);
      tl.to("#ring-debts", { opacity: 0, duration: 0.12 }, T.reports - 0.12);
      tl.fromTo("#img-reports", { y: 0 }, { y: -200, duration: 1.8, ease: "power2.inOut" }, T.reports + 0.55);
      tl.to("#phone", { y: 1400, duration: 0.22, ease: "power3.in" }, T.trust - 0.22);

      // Trust: night falls from the middle of the frame.
      tl.fromTo("#trust-night", { clipPath: "circle(0% at 50% 60%)" }, { clipPath: "circle(150% at 50% 60%)", duration: 0.4, ease: "power2.inOut" }, T.trust);
      tl.fromTo("#trust-badge", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, T.trust + 0.1);
      blurIn("#trust-line", T.trust + 0.25);
      tl.fromTo("#trust-pill", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, T.trust + 0.45);
      tl.to("#trust-stack", { opacity: 0, filter: "blur(8px)", duration: 0.14, ease: "power2.in" }, T.close - 0.15);

      // Close: the ground floods teal and the mark lands. beat-locked: 15.82s; the button lands on 18.01s.
      tl.fromTo("#close-flood", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" }, T.close);
      tl.fromTo("#close-logo", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, T.close + 0.05);
      blurIn("#close-name", T.close + 0.3);
      tl.fromTo(".cw", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.13, stagger: 0.09, ease: "power4.out" }, T.close + 0.5);
      tl.fromTo("#close-cta", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, T.cta - 0.1);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`
}

for (const lang of ['en', 'tw']) {
  const dir = path.join(out, lang)
  for (const sub of ['assets/shots', 'assets/voice', 'assets/music', 'assets/sfx/interface']) fs.mkdirSync(path.join(dir, sub), { recursive: true })
  fs.copyFileSync(path.join(video, 'public/azaria-icon.png'), path.join(dir, 'assets/azaria-icon.png'))
  for (const scene of script[lang]) {
    fs.copyFileSync(path.join(video, `public/voice/brag-${lang}-${scene.id}.wav`), path.join(dir, `assets/voice/${scene.id}.wav`))
    if (scene.shot) fs.copyFileSync(path.join(video, `public/shots/${lang}-${scene.shot}.png`), path.join(dir, `assets/shots/${scene.shot}.png`))
  }
  fs.copyFileSync(path.join(skill, 'assets/music', MUSIC), path.join(dir, 'assets/music', MUSIC))
  for (const f of SFX) fs.copyFileSync(path.join(skill, 'assets/sfx', f), path.join(dir, 'assets/sfx', f))
  fs.writeFileSync(path.join(dir, 'index.html'), page(lang))
  console.log('wrote', lang)
}
