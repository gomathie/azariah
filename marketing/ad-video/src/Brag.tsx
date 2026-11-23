import React from "react";
import {
  AbsoluteFill,
  Composition,
  Freeze,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import bragData from "./brag.json";
import durationData from "./brag-durations.json";
import { Backdrop, Flame, Icon, IconBadge, type IconName } from "./Art";

/**
 * The short "brag" cuts: about 19 seconds, vertical, one claim per scene, every cut on a beat.
 *
 * - Words on screen and words spoken come from brag.json; each scene's line is what the voice says.
 * - A scene lasts as long as its voice line, rounded up to the next beat (brag-durations.json).
 *   scripts/make-brag-music.mjs uses the same rule to put its effects on the cuts.
 * - Words stay between 250 and 1536 pixels from the top and off the right edge of the lower half,
 *   where Reels, TikTok and Shorts draw their own buttons.
 * - Frame 0 is the closing scene, settled, so every platform's thumbnail shows the brand.
 */

type Lang = "en" | "tw";
type Scene = { id: string; line: string; say: string; sub?: string; cta?: string; shot?: string; icon?: string };

const SCRIPT = bragData as Record<Lang, Scene[]>;
const DURATIONS = durationData as Record<Lang, Record<string, number>>;

const FPS = 30;
const BEAT = 15; // frames; 120 beats a minute
const VOICE_DELAY = 3;
const SAFE_TOP = 270;
const SIDE = 100;

const TEAL = "#0f766e";
const TEAL_DARK = "#115e59";
const TEAL_SOFT = "#ccfbf1";
const AMBER = "#fbbf24";
const INK = "#0f172a";
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Same rule as sceneFrames in scripts/make-brag-music.mjs. */
const sceneFrames = (lang: Lang, id: string) =>
  Math.max(id === "brand" ? 45 : 60, Math.ceil((((DURATIONS[lang][id] ?? 2) + 0.2) * FPS) / BEAT) * BEAT);
const totalFrames = (lang: Lang) => SCRIPT[lang].reduce((sum, scene) => sum + sceneFrames(lang, scene.id), 0);

/** A small kick on every beat, so badges and buttons move with the music. */
const useBeat = (amount = 0.04) => {
  const frame = useCurrentFrame();
  return 1 + amount * Math.exp(-(frame % BEAT) / 4);
};

const usePop = (delay = 0, from = 60) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.6 } });
  return {
    opacity: Math.min(1, Math.max(0, t * 1.4)),
    transform: `translateY(${interpolate(t, [0, 1], [from, 0])}px) scale(${interpolate(t, [0, 1], [0.9, 1])})`,
  };
};

/** A line that arrives one word at a time, quickly, and then holds. */
const Words: React.FC<{ text: string; size: number; color: string; center?: boolean; step?: number; delay?: number }> = ({
  text,
  size,
  color,
  center,
  step = 2,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: center ? "center" : "flex-start",
        columnGap: size * 0.26,
        fontSize: size,
        lineHeight: 1.08,
        fontWeight: 800,
        letterSpacing: -1.5,
        color,
      }}
    >
      {text.split(" ").map((word, i) => {
        const t = spring({ frame: frame - delay - i * step, fps, config: { damping: 14, mass: 0.5 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: Math.min(1, t * 1.5),
              transform: `translateY(${interpolate(t, [0, 1], [46, 0])}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const BrandTag: React.FC<{ light?: boolean }> = ({ light }) => (
  <div style={{ position: "absolute", top: 150, left: SIDE, display: "flex", alignItems: "center", gap: 16 }}>
    <Img src={staticFile("azaria-icon.png")} style={{ width: 64, height: 64, borderRadius: 16 }} />
    <span style={{ fontSize: 40, fontWeight: 800, color: light ? "white" : TEAL_DARK }}>Azaria</span>
  </div>
);

/** The opening question over a till display that cannot settle on a figure. */
const Hook: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const beat = useBeat(0.05);
  // Changes every two frames; a fixed sequence, so every render is the same.
  const n = Math.floor(frame / 2);
  const amount = ((n * 7919 + 137) % 9000) + 100;
  return (
    <AbsoluteFill>
      <Backdrop tone="dark" />
      <BrandTag light />
      <div style={{ position: "absolute", top: SAFE_TOP + 60, left: SIDE, right: SIDE }}>
        <Words text={scene.line} size={124} color="white" />
      </div>
      <div style={{ position: "absolute", top: 1000, left: SIDE, right: 180, ...usePop(8) }}>
        <div
          style={{
            transform: `scale(${beat})`,
            background: "rgba(255,255,255,0.08)",
            border: "3px solid rgba(255,255,255,0.2)",
            borderRadius: 44,
            padding: "44px 50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 110, fontWeight: 800, color: AMBER, fontVariantNumeric: "tabular-nums", filter: "blur(1.5px)" }}>
            GH₵{amount.toLocaleString("en-GH")}
          </span>
          <div style={{ width: 120, height: 120, borderRadius: 60, background: AMBER, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="question" size={84} color={INK} stroke={2.6} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Brand: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 10, mass: 0.6 } });
  const ring = interpolate(frame, [0, 30], [1, 2.6], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Backdrop tone="teal" />
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
        <div style={{ position: "relative", width: 340, height: 340 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 84, border: "6px solid white", transform: `scale(${ring})`, opacity: Math.max(0, 0.6 - (ring - 1) * 0.4) }} />
          <Img
            src={staticFile("azaria-icon.png")}
            style={{ width: 340, height: 340, borderRadius: 84, transform: `scale(${pop})`, boxShadow: "0 30px 80px rgba(0,0,0,0.3)" }}
          />
        </div>
        <Words text={scene.line} size={150} color="white" center delay={4} />
      </div>
    </AbsoluteFill>
  );
};

/** Where to draw the eye on a screenshot, in the screenshot's own pixels (1170 wide). */
const FOCUS: Record<string, { x: number; y: number; w: number; h: number }> = {
  home: { x: 48, y: 243, w: 1074, h: 600 },
  customers: { x: 50, y: 425, w: 1070, h: 206 },
};

const Shot: React.FC<{ scene: Scene; lang: Lang; frames: number }> = ({ scene, lang, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = useBeat(0.05);
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  const width = 640;
  const inner = width - 32;
  const k = inner / 1170;
  const focus = FOCUS[scene.shot ?? ""];
  const ring = spring({ frame: frame - 12, fps, config: { damping: 12, mass: 0.5 } });
  // With nothing to point at, the page scrolls a little, as if a thumb moved it.
  const scroll = focus ? 0 : interpolate(frame, [14, frames], [0, -150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Backdrop tone="light" />
      <BrandTag />
      <div style={{ position: "absolute", top: SAFE_TOP, left: SIDE, right: SIDE, display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ ...usePop(0), flexShrink: 0 }}>
          <div style={{ transform: `scale(${beat})` }}>
            <IconBadge name={(scene.icon ?? "wallet") as IconName} size={124} background={TEAL} color="white" />
          </div>
        </div>
        <Words text={scene.line} size={80} color={INK} delay={2} />
      </div>
      <div
        style={{
          position: "absolute",
          left: (1080 - width) / 2,
          top: 640,
          width,
          height: width * 2,
          borderRadius: 72,
          background: INK,
          padding: 16,
          boxShadow: "0 50px 120px rgba(15, 23, 42, 0.4)",
          transform: `translateY(${interpolate(enter, [0, 1], [320, 0])}px) rotate(${interpolate(enter, [0, 1], [5, 0])}deg)`,
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 58, overflow: "hidden", background: "#f8fafc" }}>
          <Img src={staticFile(`shots/${lang}-${scene.shot}.png`)} style={{ width: "100%", transform: `translateY(${scroll}px)` }} />
          {focus ? (
            <div
              style={{
                position: "absolute",
                left: focus.x * k - 8,
                top: focus.y * k - 8,
                width: focus.w * k + 16,
                height: focus.h * k + 16,
                borderRadius: 30,
                border: `8px solid ${AMBER}`,
                boxShadow: "0 0 0 2000px rgba(15,23,42,0.28)",
                opacity: Math.min(1, ring),
                transform: `scale(${interpolate(ring, [0, 1], [1.2, 1]) * (1 + (beat - 1) * 0.4)})`,
              }}
            />
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Trust: React.FC<{ scene: Scene }> = ({ scene }) => {
  const beat = useBeat(0.06);
  return (
    <AbsoluteFill>
      <Backdrop tone="dark" />
      <BrandTag light />
      <div style={{ position: "absolute", top: 470, left: SIDE, right: SIDE, display: "flex", flexDirection: "column", alignItems: "center", gap: 56 }}>
        <div style={usePop(0)}>
          <div style={{ transform: `scale(${beat})` }}>
            <IconBadge name="wifiOff" size={300} background={TEAL_SOFT} color={TEAL_DARK} />
          </div>
        </div>
        <Words text={scene.line} size={112} color="white" center delay={3} />
        {scene.sub ? (
          <div style={{ ...usePop(16), display: "flex", alignItems: "center", gap: 20, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "22px 40px" }}>
            <Icon name="lock" size={56} color={AMBER} />
            <span style={{ fontSize: 48, fontWeight: 700, color: "white" }}>{scene.sub}</span>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const Close: React.FC<{ scene: Scene }> = ({ scene }) => {
  const beat = useBeat(0.05);
  return (
    <AbsoluteFill>
      <Backdrop tone="teal" />
      <div style={{ position: "absolute", top: 400, left: 150, right: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 54 }}>
        <Img src={staticFile("azaria-icon.png")} style={{ ...usePop(0), width: 250, height: 250, borderRadius: 62, boxShadow: "0 30px 80px rgba(0,0,0,0.3)" }} />
        <div style={{ ...usePop(3), display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 76, fontWeight: 800, color: "white" }}>Azaria</span>
          <Flame size={70} />
        </div>
        <Words text={scene.line} size={104} color="white" center delay={6} step={3} />
        <div style={usePop(34)}>
          <div
            style={{
              transform: `scale(${beat})`,
              background: AMBER,
              color: INK,
              fontSize: 56,
              fontWeight: 800,
              padding: "32px 60px",
              borderRadius: 999,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            }}
          >
            {scene.cta}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ scene: Scene; lang: Lang; frames: number }> = ({ scene, lang, frames }) => {
  if (scene.id === "hook") return <Hook scene={scene} />;
  if (scene.id === "brand") return <Brand scene={scene} />;
  if (scene.cta) return <Close scene={scene} />;
  if (scene.shot) return <Shot scene={scene} lang={lang} frames={frames} />;
  return <Trust scene={scene} />;
};

export const AzariaBrag: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const scenes = SCRIPT[lang];
  const total = totalFrames(lang);
  const close = scenes[scenes.length - 1];
  const closeFrames = sceneFrames(lang, close.id);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: INK, fontFamily: FONT }}>
      {/* One track holds the music and the effects on the cuts. It sits under the voice and lifts for the close. */}
      <Html5Audio
        src={staticFile(`audio/brag-music-${lang}.wav`)}
        volume={(f) => interpolate(f, [total - closeFrames, total - closeFrames + 15], [0.24, 0.34], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      {scenes.map((scene) => {
        const frames = sceneFrames(lang, scene.id);
        const start = from;
        from += frames;
        return (
          <Sequence key={scene.id} name={scene.id} from={start} durationInFrames={frames}>
            <SceneView scene={scene} lang={lang} frames={frames} />
            <Sequence from={VOICE_DELAY}>
              <Html5Audio src={staticFile(`voice/brag-${lang}-${scene.id}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
      {/* Frame 0 is the poster: the closing scene, settled. */}
      {frame === 0 ? (
        <Freeze frame={closeFrames - 20}>
          <Close scene={close} />
        </Freeze>
      ) : null}
      <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(frame / total) * 100}%`, background: AMBER }} />
    </AbsoluteFill>
  );
};

export const BragCompositions: React.FC = () => (
  <>
    {(["en", "tw"] as Lang[]).map((lang) => (
      <Composition
        key={lang}
        id={lang === "en" ? "AzariaBragEnglish" : "AzariaBragTwi"}
        component={AzariaBrag}
        defaultProps={{ lang }}
        durationInFrames={totalFrames(lang)}
        fps={FPS}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
