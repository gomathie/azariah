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

/**
 * Azaria ad, vertical, for WhatsApp status, Instagram, TikTok and Facebook.
 * One composition per language. The words on screen and the words spoken come from script.json.
 * Each scene lasts as long as its voice-over (durations.json) plus a short breath.
 * The phone screens are real screenshots of the app with sample data (public/shots).
 */

type Lang = "en" | "tw";
type Scene = {
  id: string;
  headline: string;
  support?: string;
  points?: string[];
  shot?: string;
  cta?: string;
  say: string;
};

const SCRIPT = scriptData as Record<Lang, Scene[]>;
const DURATIONS = durationData as Record<Lang, Record<string, number>>;

const FPS = 30;
/** Silence after each line, so the ad does not feel rushed. */
const BREATH_SECONDS = 0.55;
const TEAL = "#0f766e";
const TEAL_DARK = "#115e59";
const TEAL_SOFT = "#ccfbf1";
const INK = "#0f172a";
const MUTED = "#475569";
const PAPER = "#f8fafc";
const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const sceneFrames = (lang: Lang, id: string) =>
  Math.round(((DURATIONS[lang][id] ?? 4) + BREATH_SECONDS) * FPS);
const totalFrames = (lang: Lang) =>
  SCRIPT[lang].reduce((sum, scene) => sum + sceneFrames(lang, scene.id), 0);

/** A soft rise-and-fade used for every piece of text, so the ad moves in one consistent way. */
const useRise = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return {
    opacity: t,
    transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px)`,
  };
};

const SceneShell: React.FC<{
  frames: number;
  background: string;
  justify?: "center" | "flex-start";
  children: React.ReactNode;
}> = ({ frames, background, justify = "center", children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, frames - 8, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background, fontFamily: FONT, opacity }}>
      <AbsoluteFill
        style={{ padding: "130px 90px", justifyContent: justify, gap: 48 }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Headline: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
  size?: number;
  center?: boolean;
}> = ({ children, color = INK, delay = 0, size = 96, center }) => (
  <div
    style={{
      ...useRise(delay),
      fontSize: size,
      lineHeight: 1.08,
      fontWeight: 800,
      color,
      letterSpacing: -1.5,
      textAlign: center ? "center" : "left",
    }}
  >
    {children}
  </div>
);

const Support: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
}> = ({ children, color = MUTED, delay = 14 }) => (
  <div
    style={{
      ...useRise(delay),
      fontSize: 52,
      lineHeight: 1.3,
      fontWeight: 500,
      color,
    }}
  >
    {children}
  </div>
);

const PointLine: React.FC<{
  children: React.ReactNode;
  delay: number;
  color: string;
  mark: React.ReactNode;
}> = ({ children, delay, color, mark }) => (
  <div
    style={{
      ...useRise(delay),
      display: "flex",
      alignItems: "center",
      gap: 28,
      fontSize: 56,
      fontWeight: 600,
      color,
    }}
  >
    {mark}
    {children}
  </div>
);

const Dot = (
  <span
    style={{
      width: 22,
      height: 22,
      borderRadius: 11,
      background: "#ea580c",
      flexShrink: 0,
    }}
  />
);

const Tick = (
  <svg width="56" height="56" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="11" fill={TEAL_SOFT} />
    <path
      d="M7 12.5l3.2 3.2L17 9"
      fill="none"
      stroke={TEAL_DARK}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** A real screenshot of the app inside a simple phone body, drifting gently so the frame is alive. */
const Phone: React.FC<{ src: string; frames: number }> = ({ src, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const drift = interpolate(frame, [0, frames], [0, -26], {
    extrapolateRight: "clamp",
  });
  const width = 700;
  return (
    <div
      style={{
        alignSelf: "center",
        width,
        height: width * 2,
        borderRadius: 76,
        background: INK,
        padding: 18,
        boxShadow: "0 50px 120px rgba(15, 23, 42, 0.35)",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [120, 0]) + drift}px)`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 60,
          overflow: "hidden",
          background: "white",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      </div>
    </div>
  );
};

const SceneView: React.FC<{ scene: Scene; lang: Lang; frames: number }> = ({
  scene,
  lang,
  frames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (scene.id === "brand") {
    const pop = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
    return (
      <SceneShell frames={frames} background={TEAL}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 44,
          }}
        >
          <Img
            src={staticFile("azaria-icon.png")}
            style={{
              width: 300,
              height: 300,
              borderRadius: 72,
              transform: `scale(${pop})`,
              boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
            }}
          />
          <Headline color="white" delay={10} size={150} center>
            {scene.headline}
          </Headline>
          <Support color={TEAL_SOFT} delay={24}>
            {scene.support}
          </Support>
        </div>
      </SceneShell>
    );
  }

  if (scene.cta) {
    return (
      <SceneShell frames={frames} background={TEAL}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 44,
          }}
        >
          <Img
            src={staticFile("azaria-icon.png")}
            style={{ width: 220, height: 220, borderRadius: 54 }}
          />
          <Headline color="white" size={100} center>
            {scene.headline}
          </Headline>
          <CallToAction>{scene.cta}</CallToAction>
        </div>
      </SceneShell>
    );
  }

  if (scene.shot) {
    return (
      <SceneShell frames={frames} background={PAPER} justify="flex-start">
        <Headline size={88}>{scene.headline}</Headline>
        <Phone src={`shots/${lang}-${scene.shot}.png`} frames={frames} />
      </SceneShell>
    );
  }

  if (scene.points) {
    const dark = scene.id === "trust";
    return (
      <SceneShell frames={frames} background={dark ? TEAL_DARK : "#fff7ed"}>
        <Headline color={dark ? "white" : "#9a3412"} size={88}>
          {scene.headline}
        </Headline>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {scene.points.map((point, i) => (
            <PointLine
              key={point}
              delay={16 + i * 22}
              color={dark ? "white" : INK}
              mark={dark ? Tick : Dot}
            >
              {point}
            </PointLine>
          ))}
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell frames={frames} background={PAPER}>
      <Headline size={112}>{scene.headline}</Headline>
      {scene.support ? <Support delay={34}>{scene.support}</Support> : null}
    </SceneShell>
  );
};

const CallToAction: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      ...useRise(30),
      background: "white",
      color: TEAL_DARK,
      fontSize: 56,
      fontWeight: 800,
      padding: "30px 64px",
      borderRadius: 999,
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

export const AzariaAd: React.FC<{ lang: Lang }> = ({ lang }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {SCRIPT[lang].map((scene) => {
        const frames = sceneFrames(lang, scene.id);
        const start = from;
        from += frames;
        return (
          <Sequence
            key={scene.id}
            name={scene.id}
            from={start}
            durationInFrames={frames}
          >
            <SceneView scene={scene} lang={lang} frames={frames} />
            {/* The voice starts a moment after the picture, once the scene has faded in. */}
            <Sequence from={6}>
              <Html5Audio src={staticFile(`voice/${lang}-${scene.id}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="AzariaAdEnglish"
        component={AzariaAd}
        defaultProps={{ lang: "en" as Lang }}
        durationInFrames={totalFrames("en")}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="AzariaAdTwi"
        component={AzariaAd}
        defaultProps={{ lang: "tw" as Lang }}
        durationInFrames={totalFrames("tw")}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
