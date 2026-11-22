import React from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Azaria ad, 30 seconds, vertical for WhatsApp status, Instagram and TikTok.
 * Every claim on screen is something the app does today. Amounts are sample figures.
 */

const FPS = 30;
const TEAL = "#0f766e";
const TEAL_DARK = "#115e59";
const TEAL_SOFT = "#ccfbf1";
const INK = "#0f172a";
const MUTED = "#475569";
const PAPER = "#f8fafc";
const GREEN = "#047857";
const RED = "#b91c1c";
const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const SCENES = [
  { id: "hook", seconds: 4 },
  { id: "problem", seconds: 4 },
  { id: "brand", seconds: 3 },
  { id: "money", seconds: 4.5 },
  { id: "record", seconds: 4 },
  { id: "debts", seconds: 4 },
  { id: "trust", seconds: 3 },
  { id: "close", seconds: 3.5 },
] as const;
const TOTAL = Math.round(SCENES.reduce((sum, s) => sum + s.seconds, 0) * FPS);

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

/** Fades a whole scene out over its last frames so cuts are never hard. */
const SceneShell: React.FC<{
  frames: number;
  background: string;
  children: React.ReactNode;
}> = ({ frames, background, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, frames - 8, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background, fontFamily: FONT, opacity }}>
      <AbsoluteFill
        style={{ padding: "140px 90px", justifyContent: "center", gap: 48 }}
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
}> = ({ children, color = INK, delay = 0, size = 96 }) => (
  <div
    style={{
      ...useRise(delay),
      fontSize: size,
      lineHeight: 1.08,
      fontWeight: 800,
      color,
      letterSpacing: -1.5,
    }}
  >
    {children}
  </div>
);

const Support: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
}> = ({ children, color = MUTED, delay = 12 }) => (
  <div
    style={{
      ...useRise(delay),
      fontSize: 50,
      lineHeight: 1.3,
      fontWeight: 500,
      color,
    }}
  >
    {children}
  </div>
);

const Card: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => (
  <div
    style={{
      ...useRise(delay),
      background: "white",
      borderRadius: 36,
      border: "2px solid #e2e8f0",
      padding: "36px 40px",
      boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Counts up to a figure, then holds. Sample numbers only. */
const useCount = (to: number, delay: number, durationFrames = 30) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + durationFrames], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};
const cedis = (value: number) =>
  `GH₵${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ---------------------------------------------------------------------------------------------

const Hook: React.FC<{ frames: number }> = ({ frames }) => (
  <SceneShell frames={frames} background={PAPER}>
    <Headline size={112}>How much did your shop make today?</Headline>
    <Support delay={28}>If you have to guess, you are losing money.</Support>
  </SceneShell>
);

const Problem: React.FC<{ frames: number }> = ({ frames }) => {
  const lines = [
    "The notebook gets lost.",
    "Customer debts get forgotten.",
    "Cash and MoMo get mixed up.",
  ];
  return (
    <SceneShell frames={frames} background="#fff7ed">
      <Headline color="#9a3412" size={84}>
        Sound familiar?
      </Headline>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {lines.map((line, i) => (
          <ProblemLine key={line} delay={14 + i * 16}>
            {line}
          </ProblemLine>
        ))}
      </div>
    </SceneShell>
  );
};

const ProblemLine: React.FC<{ children: React.ReactNode; delay: number }> = ({
  children,
  delay,
}) => (
  <div
    style={{
      ...useRise(delay),
      display: "flex",
      alignItems: "center",
      gap: 28,
      fontSize: 56,
      fontWeight: 600,
      color: INK,
    }}
  >
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        background: "#ea580c",
        flexShrink: 0,
      }}
    />
    {children}
  </div>
);

const Brand: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
        <Headline color="white" delay={10} size={150}>
          Azaria
        </Headline>
        <Support color={TEAL_SOFT} delay={24}>
          Record Today. Grow Tomorrow.
        </Support>
      </div>
    </SceneShell>
  );
};

const Money: React.FC<{ frames: number }> = ({ frames }) => {
  const total = useCount(579, 22);
  return (
    <SceneShell frames={frames} background={PAPER}>
      <Headline>See all your money in one place.</Headline>
      <div
        style={{
          ...useRise(14),
          background: TEAL,
          borderRadius: 44,
          padding: "48px 48px 40px",
          color: "white",
          boxShadow: "0 30px 70px rgba(15, 118, 110, 0.35)",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 600, color: TEAL_SOFT }}>
          Money available
        </div>
        <div
          style={{
            fontSize: 124,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            marginTop: 6,
          }}
        >
          {cedis(Math.round(total))}
        </div>
        <AccountRow name="Cash" amount={434} delay={40} />
        <AccountRow name="Mobile Money" amount={145} delay={52} />
      </div>
      <Support delay={70}>Cash, Mobile Money and bank. Always up to date.</Support>
    </SceneShell>
  );
};

const AccountRow: React.FC<{ name: string; amount: number; delay: number }> = ({
  name,
  amount,
  delay,
}) => (
  <div
    style={{
      ...useRise(delay),
      marginTop: 20,
      background: "rgba(255,255,255,0.14)",
      borderRadius: 26,
      padding: "26px 32px",
      display: "flex",
      justifyContent: "space-between",
      fontSize: 46,
      fontWeight: 600,
    }}
  >
    <span>{name}</span>
    <span style={{ fontVariantNumeric: "tabular-nums" }}>{cedis(amount)}</span>
  </div>
);

const RecordScene: React.FC<{ frames: number }> = ({ frames }) => {
  const entries = [
    { label: "Sale — Rice 5kg", amount: "+GH₵120.00", color: GREEN },
    { label: "Expense — Transport", amount: "−GH₵25.00", color: RED },
    { label: "Sale — Cooking oil", amount: "+GH₵85.00", color: GREEN },
  ];
  return (
    <SceneShell frames={frames} background={PAPER}>
      <Headline>Record a sale in seconds.</Headline>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {entries.map((entry, i) => (
          <Card key={entry.label} delay={16 + i * 14}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 24,
              }}
            >
              <span style={{ fontSize: 46, fontWeight: 600, color: INK }}>
                {entry.label}
              </span>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: entry.color,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.amount}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <Support delay={66}>
        Sales and expenses kept apart, so you see what is really happening.
      </Support>
    </SceneShell>
  );
};

const Debts: React.FC<{ frames: number }> = ({ frames }) => {
  const people = [
    { name: "Abena Owusu", owes: 190 },
    { name: "Kofi Mensah", owes: 40 },
  ];
  return (
    <SceneShell frames={frames} background={PAPER}>
      <Headline>Know exactly who owes you.</Headline>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {people.map((person, i) => (
          <Card key={person.name} delay={16 + i * 14}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 48, fontWeight: 600, color: INK }}>
                {person.name}
              </span>
              <span
                style={{
                  fontSize: 50,
                  fontWeight: 800,
                  color: INK,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {cedis(person.owes)}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <Support delay={52}>
        Record part payments. Send a WhatsApp reminder in one tap.
      </Support>
    </SceneShell>
  );
};

const Trust: React.FC<{ frames: number }> = ({ frames }) => {
  const points = [
    "Works without internet",
    "Your records stay private",
    "English, Français and Twi",
    "Reports as PDF or Excel",
  ];
  return (
    <SceneShell frames={frames} background={TEAL_DARK}>
      <Headline color="white" size={84}>
        Built for the way you work.
      </Headline>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {points.map((point, i) => (
          <TrustLine key={point} delay={10 + i * 10}>
            {point}
          </TrustLine>
        ))}
      </div>
    </SceneShell>
  );
};

const TrustLine: React.FC<{ children: React.ReactNode; delay: number }> = ({
  children,
  delay,
}) => (
  <div
    style={{
      ...useRise(delay),
      display: "flex",
      alignItems: "center",
      gap: 28,
      fontSize: 54,
      fontWeight: 600,
      color: "white",
    }}
  >
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
    {children}
  </div>
);

const Close: React.FC<{ frames: number }> = ({ frames }) => (
  <SceneShell frames={frames} background={TEAL}>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 40,
      }}
    >
      <Img
        src={staticFile("azaria-icon.png")}
        style={{ width: 220, height: 220, borderRadius: 54 }}
      />
      <Headline color="white" size={104}>
        Know your business. Grow your business.
      </Headline>
      <div
        style={{
          ...useRise(26),
          background: "white",
          color: TEAL_DARK,
          fontSize: 56,
          fontWeight: 800,
          padding: "30px 64px",
          borderRadius: 999,
        }}
      >
        Start with Azaria today
      </div>
    </div>
  </SceneShell>
);

const SCENE_COMPONENTS: Record<
  (typeof SCENES)[number]["id"],
  React.FC<{ frames: number }>
> = {
  hook: Hook,
  problem: Problem,
  brand: Brand,
  money: Money,
  record: RecordScene,
  debts: Debts,
  trust: Trust,
  close: Close,
};

export const AzariaAd: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {SCENES.map((scene) => {
        const frames = Math.round(scene.seconds * FPS);
        const start = from;
        from += frames;
        const Scene = SCENE_COMPONENTS[scene.id];
        return (
          <Sequence
            key={scene.id}
            name={scene.id}
            from={start}
            durationInFrames={frames}
          >
            <Scene frames={frames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="AzariaAd"
      component={AzariaAd}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
