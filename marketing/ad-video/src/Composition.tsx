import React from "react";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import scriptData from "./script.json";
import durationData from "./durations.json";
import { Backdrop, Coin, Flame, Icon, IconBadge, ShopFront, type IconName } from "./Art";

/**
 * Azaria ads, vertical, for WhatsApp status, Instagram, TikTok and Facebook.
 *
 * Built on what short-video research agrees on:
 *  - the question that hooks the viewer is on screen in the first second, with the brand beside it;
 *  - every spoken line is also a caption, because most people watch with the sound off;
 *  - words stay inside the area the apps do not cover with their own buttons (SAFE below);
 *  - a short cut exists next to the full one, since 15 to 35 seconds is where most ads hold attention.
 *
 * One composition per language and length. Words on screen and words spoken come from script.json.
 * Each scene lasts as long as its voice-over (durations.json) plus a short breath.
 * The phone screens are real screenshots of the app with sample data (public/shots).
 */

type Lang = "en" | "tw";
type Scene = {
  id: string;
  headline: string;
  support?: string;
  points?: string[];
  icons?: string[];
  icon?: string;
  shot?: string;
  cta?: string;
  say: string;
  caption?: string;
};

const SCRIPT = scriptData as unknown as Record<Lang, Scene[]> & { short: string[] };
const DURATIONS = durationData as Record<Lang, Record<string, number>>;

const FPS = 30;
/** Silence after each line. Short, so the ad keeps moving. */
const BREATH_SECONDS = 0.4;
/** Frames before the voice starts in a scene, once the picture has arrived. */
const VOICE_DELAY = 6;

/**
 * Where words may go on a 1080 x 1920 frame. TikTok and Instagram draw their own buttons,
 * captions and account name over the top, the bottom and the right edge. These are the cautious
 * figures; pictures may run outside them, words may not.
 */
const SAFE = { top: 270, bottom: 660, side: 100 };

const TEAL = "#0f766e";
const TEAL_DARK = "#115e59";
const TEAL_SOFT = "#ccfbf1";
const INK = "#0f172a";
const MUTED = "#475569";
const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const scenesFor = (lang: Lang, short: boolean) =>
  short ? SCRIPT[lang].filter((scene) => SCRIPT.short.includes(scene.id)) : SCRIPT[lang];
const sceneFrames = (lang: Lang, id: string) =>
  Math.round(((DURATIONS[lang][id] ?? 4) + BREATH_SECONDS) * FPS) + VOICE_DELAY;
const totalFrames = (lang: Lang, short: boolean) =>
  scenesFor(lang, short).reduce((sum, scene) => sum + sceneFrames(lang, scene.id), 0);

/** A quick rise-and-settle used for every element, so the ad moves in one consistent way. */
const usePop = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.7 } });
  return {
    opacity: Math.min(1, Math.max(0, t)),
    transform: `translateY(${interpolate(t, [0, 1], [50, 0])}px) scale(${interpolate(t, [0, 1], [0.94, 1])})`,
  };
};

/** The mark and name in the top corner of every scene, so the brand is never off screen. */
const BrandTag: React.FC<{ light?: boolean }> = ({ light }) => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top - 110,
      left: SAFE.side,
      display: "flex",
      alignItems: "center",
      gap: 18,
      fontFamily: FONT,
    }}
  >
    <Img src={staticFile("azaria-icon.png")} style={{ width: 72, height: 72, borderRadius: 18 }} />
    <span style={{ fontSize: 44, fontWeight: 800, color: light ? "white" : TEAL_DARK, letterSpacing: -0.5 }}>
      Azaria
    </span>
  </div>
);

/** A thin line across the top that fills as the ad plays, so viewers know how long is left. */
const Progress: React.FC<{ total: number; offset: number; light?: boolean }> = ({ total, offset, light }) => {
  const frame = useCurrentFrame();
  const width = interpolate(frame + offset, [0, total], [0, 100], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: light ? "rgba(255,255,255,0.25)" : "rgba(15,118,110,0.18)" }}>
      <div style={{ width: `${width}%`, height: "100%", background: light ? "white" : TEAL }} />
    </div>
  );
};

/**
 * The spoken line as a caption, a few words at a time, in step with the voice.
 * It sits just above the area the apps cover at the bottom.
 */
const Captions: React.FC<{ text: string; seconds: number; light?: boolean }> = ({ text, seconds, light }) => {
  const frame = useCurrentFrame();
  const chunks = React.useMemo(() => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > 26 && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
      if (/[.?!]$/.test(word)) {
        out.push(line);
        line = "";
      }
    }
    if (line) out.push(line);
    return out;
  }, [text]);
  // Each chunk gets a share of the time in proportion to its length.
  const totalChars = chunks.reduce((n, c) => n + c.length, 0) || 1;
  const voiceFrames = seconds * FPS;
  let start = VOICE_DELAY;
  let current = "";
  let local = 0;
  for (const chunk of chunks) {
    const length = (chunk.length / totalChars) * voiceFrames;
    if (frame >= start && frame < start + length + 2) {
      current = chunk;
      local = frame - start;
      break;
    }
    start += length;
  }
  if (!current) return null;
  const pop = interpolate(local, [0, 4], [0.92, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.side,
        right: SAFE.side,
        bottom: SAFE.bottom + 10,
        display: "flex",
        justifyContent: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          transform: `scale(${pop})`,
          background: light ? "rgba(255,255,255,0.96)" : "rgba(15,23,42,0.92)",
          color: light ? INK : "white",
          fontSize: 50,
          fontWeight: 700,
          lineHeight: 1.2,
          padding: "22px 36px",
          borderRadius: 26,
          textAlign: "center",
          maxWidth: "100%",
          boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
        }}
      >
        {current}
      </div>
    </div>
  );
};

const Frame: React.FC<{
  frames: number;
  tone: "light" | "teal" | "warm" | "dark";
  children: React.ReactNode;
}> = ({ frames, tone, children }) => {
  const frame = useCurrentFrame();
  // A quick cross-fade: long enough to be smooth, short enough to feel like a cut.
  const opacity = interpolate(frame, [0, 5, frames - 5, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity, fontFamily: FONT }}>
      <Backdrop tone={tone} />
      {children}
    </AbsoluteFill>
  );
};

/** The band of the frame where words are allowed. */
const SafeArea: React.FC<{ children: React.ReactNode; justify?: "center" | "flex-start" }> = ({
  children,
  justify = "center",
}) => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top,
      left: SAFE.side,
      right: SAFE.side,
      bottom: SAFE.bottom + 170,
      display: "flex",
      flexDirection: "column",
      justifyContent: justify,
      gap: 40,
    }}
  >
    {children}
  </div>
);

const Headline: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
  size?: number;
  center?: boolean;
}> = ({ children, color = INK, delay = 0, size = 92, center }) => (
  <div
    style={{
      ...usePop(delay),
      fontSize: size,
      lineHeight: 1.06,
      fontWeight: 800,
      color,
      letterSpacing: -1.5,
      textAlign: center ? "center" : "left",
    }}
  >
    {children}
  </div>
);

const PointRow: React.FC<{
  text: string;
  icon: IconName;
  delay: number;
  dark: boolean;
}> = ({ text, icon, delay, dark }) => (
  <div
    style={{
      ...usePop(delay),
      display: "flex",
      alignItems: "center",
      gap: 30,
      background: dark ? "rgba(255,255,255,0.1)" : "white",
      border: dark ? "2px solid rgba(255,255,255,0.18)" : "2px solid #fed7aa",
      borderRadius: 34,
      padding: "22px 30px",
      boxShadow: dark ? "none" : "0 16px 40px rgba(154, 52, 18, 0.12)",
    }}
  >
    <IconBadge
      name={icon}
      size={104}
      background={dark ? TEAL_SOFT : "#ffedd5"}
      color={dark ? TEAL_DARK : "#c2410c"}
    />
    <span style={{ fontSize: 52, fontWeight: 700, color: dark ? "white" : INK, lineHeight: 1.15 }}>{text}</span>
  </div>
);

/** A real screenshot of the app inside a simple phone body, rising into place and drifting slightly. */
const Phone: React.FC<{ src: string; frames: number }> = ({ src, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 20, mass: 0.8 } });
  const drift = interpolate(frame, [0, frames], [0, -34], { extrapolateRight: "clamp" });
  const width = 640;
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - width) / 2,
        top: 620,
        width,
        height: width * 2,
        borderRadius: 72,
        background: INK,
        padding: 16,
        boxShadow: "0 50px 120px rgba(15, 23, 42, 0.4)",
        opacity: Math.min(1, enter),
        transform: `translateY(${interpolate(enter, [0, 1], [220, 0]) + drift}px) rotate(${interpolate(enter, [0, 1], [-4, 0])}deg)`,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 58, overflow: "hidden", background: "white" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      </div>
    </div>
  );
};

/** A coin that floats beside the phone, for a little life at the edges. */
const FloatingCoin: React.FC<{ x: number; y: number; size: number; delay: number }> = ({ x, y, size, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  const bob = Math.sin((frame + delay * 5) / 16) * 14;
  return (
    <div style={{ position: "absolute", left: x, top: y + bob, transform: `scale(${t}) rotate(${bob}deg)` }}>
      <Coin size={size} />
    </div>
  );
};

const SceneView: React.FC<{ scene: Scene; lang: Lang; frames: number }> = ({ scene, lang, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (scene.id === "hook") {
    // The question lands on the first frame. The stall and the question mark give the eye something at once.
    const wobble = Math.sin(frame / 9) * 6;
    const mark = spring({ frame: frame - 8, fps, config: { damping: 9, mass: 0.6 } });
    return (
      <Frame frames={frames} tone="light">
        <BrandTag />
        <SafeArea>
          <Headline size={104}>{scene.headline}</Headline>
          <div style={{ ...usePop(10), alignSelf: "center", position: "relative", marginTop: 10 }}>
            <ShopFront width={600} />
            <div
              style={{
                position: "absolute",
                right: -30,
                top: -70,
                transform: `scale(${mark}) rotate(${wobble}deg)`,
                width: 170,
                height: 170,
                borderRadius: 85,
                background: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 16px 40px rgba(180, 83, 9, 0.35)",
              }}
            >
              <Icon name="question" size={110} color="white" stroke={2.6} />
            </div>
          </div>
        </SafeArea>
      </Frame>
    );
  }

  if (scene.id === "brand") {
    const pop = spring({ frame, fps, config: { damping: 11, mass: 0.8 } });
    const ring = (delay: number) => {
      const t = ((frame + delay) % 60) / 60;
      return { transform: `scale(${1 + t * 1.5})`, opacity: 0.5 * (1 - t) };
    };
    return (
      <Frame frames={frames} tone="teal">
        <SafeArea>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
            <div style={{ position: "relative", width: 320, height: 320 }}>
              {[0, 20, 40].map((d) => (
                <div
                  key={d}
                  style={{ position: "absolute", inset: 0, borderRadius: 80, border: "6px solid white", ...ring(d) }}
                />
              ))}
              <Img
                src={staticFile("azaria-icon.png")}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 320,
                  height: 320,
                  borderRadius: 78,
                  transform: `scale(${pop})`,
                  boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
                }}
              />
            </div>
            <Headline color="white" delay={8} size={160} center>
              {scene.headline}
            </Headline>
            <div style={{ ...usePop(20), display: "flex", alignItems: "center", gap: 16 }}>
              <Flame size={64} />
              <span style={{ fontSize: 54, fontWeight: 600, color: TEAL_SOFT }}>{scene.support}</span>
            </div>
          </div>
        </SafeArea>
      </Frame>
    );
  }

  if (scene.cta) {
    const pulse = 1 + Math.sin(frame / 7) * 0.025;
    return (
      <Frame frames={frames} tone="teal">
        <SafeArea>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
            <Img src={staticFile("azaria-icon.png")} style={{ ...usePop(0), width: 230, height: 230, borderRadius: 56 }} />
            <Headline color="white" size={96} center delay={6}>
              {scene.headline}
            </Headline>
            <div style={usePop(24)}>
              <div
                style={{
                  transform: `scale(${pulse})`,
                  background: "#fbbf24",
                  color: INK,
                  fontSize: 58,
                  fontWeight: 800,
                  padding: "34px 66px",
                  borderRadius: 999,
                  textAlign: "center",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                }}
              >
                {scene.cta}
              </div>
            </div>
          </div>
        </SafeArea>
      </Frame>
    );
  }

  if (scene.shot) {
    return (
      <Frame frames={frames} tone="light">
        <BrandTag />
        <Phone src={`shots/${lang}-${scene.shot}.png`} frames={frames} />
        <FloatingCoin x={64} y={900} size={104} delay={14} />
        <FloatingCoin x={900} y={1080} size={78} delay={22} />
        <div style={{ position: "absolute", top: SAFE.top + 10, left: SAFE.side, right: SAFE.side }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={usePop(0)}>
              <IconBadge name={(scene.icon ?? "wallet") as IconName} size={128} background={TEAL} color="white" />
            </div>
            <Headline size={78} delay={4}>
              {scene.headline}
            </Headline>
          </div>
        </div>
      </Frame>
    );
  }

  if (scene.points) {
    const dark = scene.id === "trust";
    return (
      <Frame frames={frames} tone={dark ? "dark" : "warm"}>
        <BrandTag light={dark} />
        <SafeArea>
          <Headline color={dark ? "white" : "#9a3412"} size={88}>
            {scene.headline}
          </Headline>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {scene.points.map((point, i) => (
              <PointRow
                key={point}
                text={point}
                icon={(scene.icons?.[i] ?? "coins") as IconName}
                delay={10 + i * 16}
                dark={dark}
              />
            ))}
          </div>
        </SafeArea>
      </Frame>
    );
  }

  return (
    <Frame frames={frames} tone="light">
      <BrandTag />
      <SafeArea>
        <Headline size={104}>{scene.headline}</Headline>
        {scene.support ? (
          <div style={{ ...usePop(20), fontSize: 52, fontWeight: 500, color: MUTED, lineHeight: 1.3 }}>{scene.support}</div>
        ) : null}
      </SafeArea>
    </Frame>
  );
};

export const AzariaAd: React.FC<{ lang: Lang; short: boolean }> = ({ lang, short }) => {
  const scenes = scenesFor(lang, short);
  const total = totalFrames(lang, short);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#f8fafc" }}>
      {/* Background music, kept well under the voice. It lifts for the closing scene and fades at the end. */}
      <Html5Audio
        src={staticFile("audio/music.wav")}
        volume={(f) => {
          const closing = interpolate(f, [total - sceneFrames(lang, "close"), total - sceneFrames(lang, "close") + 20], [0.13, 0.2], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(f, [total - 36, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return closing * fadeOut;
        }}
      />
      {scenes.map((scene, index) => {
        const frames = sceneFrames(lang, scene.id);
        const start = from;
        from += frames;
        const onColour = scene.id === "brand" || scene.id === "trust" || Boolean(scene.cta);
        return (
          <Sequence key={scene.id} name={scene.id} from={start} durationInFrames={frames}>
            <SceneView scene={scene} lang={lang} frames={frames} />
            <Captions text={scene.caption ?? scene.say} seconds={DURATIONS[lang][scene.id] ?? 4} light={onColour} />
            <Progress total={total} offset={start} light={onColour} />
            {/* A soft swish marks each change of scene. The first scene opens clean. */}
            {index > 0 ? <Html5Audio src={staticFile("audio/swish.wav")} volume={0.22} /> : null}
            <Sequence from={VOICE_DELAY}>
              <Html5Audio src={staticFile(`voice/${lang}-${scene.id}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const VARIANTS: { id: string; lang: Lang; short: boolean }[] = [
  { id: "AzariaAdEnglish", lang: "en", short: false },
  { id: "AzariaAdEnglishShort", lang: "en", short: true },
  { id: "AzariaAdTwi", lang: "tw", short: false },
  { id: "AzariaAdTwiShort", lang: "tw", short: true },
];

export const MyComposition = () => {
  return (
    <>
      {VARIANTS.map((v) => (
        <Composition
          key={v.id}
          id={v.id}
          component={AzariaAd}
          defaultProps={{ lang: v.lang, short: v.short }}
          durationInFrames={totalFrames(v.lang, v.short)}
          fps={FPS}
          width={1080}
          height={1920}
        />
      ))}
    </>
  );
};
