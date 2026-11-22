import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

/**
 * Icons and illustrations drawn for the Azaria ads. All vector, all original, no downloads.
 */

export type IconName =
  | "wallet"
  | "tag"
  | "book"
  | "people"
  | "chart"
  | "wifiOff"
  | "lock"
  | "globe"
  | "notebook"
  | "clock"
  | "coins"
  | "question";

const ICONS: Record<IconName, string[]> = {
  wallet: ["M3.5 7.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z", "M3.5 7.5l11-3.5v3.5", "M16.5 13.5h.01"],
  tag: ["M4 12.5 11.5 5H19v7.5L11.5 20z", "M15 9h.01"],
  book: ["M5 4.5h12a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z", "M5 17.5a2 2 0 0 1 2-2h12", "M9 8.5h6", "M9 11.5h4"],
  people: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5", "M16 4.3a3.5 3.5 0 0 1 0 6.4", "M18 14.8c2 .7 3.5 2.4 3.5 5.2"],
  chart: ["M4.5 20V4", "M4.5 20h15", "M8.5 16v-4", "M12.5 16V8", "M16.5 16v-6"],
  wifiOff: ["M3 3l18 18", "M5 12.5a10 10 0 0 1 4-2.6", "M15 9.9a10 10 0 0 1 4 2.6", "M8.5 16a5 5 0 0 1 7 0", "M2 9a15 15 0 0 1 4.5-3", "M12 5a15 15 0 0 1 10 4", "M12 19.5h.01"],
  lock: ["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3", "M12 15v2"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3 12h18", "M12 3c3 3.2 3 14.8 0 18", "M12 3c-3 3.2-3 14.8 0 18"],
  notebook: ["M6 3.5h12v17H6z", "M9 3.5v17", "M12 8h3.5", "M12 11.5h3.5", "M4 7h2M4 12h2M4 17h2"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3.5 2"],
  coins: ["M9 13a5 3 0 1 0 0-6 5 3 0 0 0 0 6z", "M4 10v4c0 1.7 2.2 3 5 3s5-1.3 5-3", "M15 11.2c2.9.1 5 1.3 5 2.8 0 1.7-2.2 3-5 3-.7 0-1.4-.1-2-.2", "M20 14v3.5c0 1.7-2.2 3-5 3-1.7 0-3.2-.5-4.1-1.2"],
  question: ["M8.5 9a3.5 3.5 0 1 1 5.6 2.8c-1.2.9-2.1 1.5-2.1 3.2", "M12 18.5h.01"],
};

export const Icon: React.FC<{ name: IconName; size?: number; color?: string; stroke?: number }> = ({
  name,
  size = 64,
  color = "currentColor",
  stroke = 1.9,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {ICONS[name].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

/** An icon in a soft round badge, the building block for lists and feature chips. */
export const IconBadge: React.FC<{
  name: IconName;
  size?: number;
  background: string;
  color: string;
}> = ({ name, size = 108, background, color }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <Icon name={name} size={size * 0.56} color={color} />
  </div>
);

/** A market stall, for the opening question. Flat shapes in the brand colours. */
export const ShopFront: React.FC<{ width?: number }> = ({ width = 620 }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 14) * 2;
  return (
    <svg width={width} height={(width * 430) / 620} viewBox="0 0 620 430">
      <ellipse cx="310" cy="408" rx="270" ry="18" fill="#0f172a" opacity="0.12" />
      {/* wall */}
      <rect x="70" y="150" width="480" height="250" rx="14" fill="#fff7ed" stroke="#0f172a" strokeWidth="6" />
      {/* counter */}
      <rect x="70" y="300" width="480" height="100" rx="10" fill="#fed7aa" stroke="#0f172a" strokeWidth="6" />
      <rect x="110" y="330" width="120" height="44" rx="8" fill="#fff7ed" stroke="#0f172a" strokeWidth="5" />
      <rect x="250" y="330" width="120" height="44" rx="8" fill="#fff7ed" stroke="#0f172a" strokeWidth="5" />
      <rect x="390" y="330" width="120" height="44" rx="8" fill="#fff7ed" stroke="#0f172a" strokeWidth="5" />
      {/* goods on the shelf */}
      <rect x="120" y="200" width="46" height="80" rx="8" fill="#14b8a6" stroke="#0f172a" strokeWidth="5" />
      <rect x="180" y="220" width="46" height="60" rx="8" fill="#f59e0b" stroke="#0f172a" strokeWidth="5" />
      <circle cx="270" cy="254" r="26" fill="#ef4444" stroke="#0f172a" strokeWidth="5" />
      <rect x="320" y="206" width="52" height="74" rx="8" fill="#0f766e" stroke="#0f172a" strokeWidth="5" />
      <rect x="386" y="228" width="46" height="52" rx="8" fill="#f59e0b" stroke="#0f172a" strokeWidth="5" />
      <circle cx="476" cy="250" r="30" fill="#14b8a6" stroke="#0f172a" strokeWidth="5" />
      <line x1="96" y1="283" x2="524" y2="283" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
      {/* awning */}
      <g transform={`rotate(${sway * 0.15} 310 90)`}>
        <path d="M40 150 L90 60 H530 L580 150 Z" fill="#0f766e" stroke="#0f172a" strokeWidth="6" strokeLinejoin="round" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${148 + i * 108 - 54} 150 L${142 + i * 88 - 22} 60 H${142 + i * 88 + 22} L${148 + i * 108} 150 Z`}
            fill="#ccfbf1"
            opacity="0.95"
          />
        ))}
        <path d="M40 150 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0 q27 34 54 0" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/** A coin with the cedi sign, used as a floating accent. */
export const Coin: React.FC<{ size?: number }> = ({ size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#fbbf24" stroke="#b45309" strokeWidth="6" />
    <circle cx="50" cy="50" r="33" fill="none" stroke="#b45309" strokeWidth="3" opacity="0.6" />
    <text x="50" y="68" textAnchor="middle" fontSize="50" fontWeight="800" fill="#92400e" fontFamily="system-ui, sans-serif">
      ₵
    </text>
  </svg>
);

/** The flame from the Azaria mark, on its own. */
export const Flame: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2.5c1 3.4 5 5.3 5 10a5 5 0 0 1-10 0c0-2 1-3.3 2.2-4.4.2 1.4.9 2.3 1.8 2.6-.4-2.900 0-5.800 1-8.200z" fill="#f59e0b" />
    <path d="M12 11c.6 1.600 2 2.300 2 4.200a2 2 0 0 1-4 0c0-1.300.9-2 2-4.200z" fill="#fde68a" />
  </svg>
);

/**
 * Moving background: two soft discs and a few small shapes that drift slowly.
 * It keeps the frame alive without pulling the eye from the message.
 */
export const Backdrop: React.FC<{ tone: "light" | "teal" | "warm" | "dark" }> = ({ tone }) => {
  const frame = useCurrentFrame();
  const palette = {
    light: { base: "#f8fafc", a: "#ccfbf1", b: "#fef3c7", ink: "#0f766e" },
    teal: { base: "#0f766e", a: "#14b8a6", b: "#115e59", ink: "#ccfbf1" },
    warm: { base: "#fff7ed", a: "#fed7aa", b: "#fef3c7", ink: "#c2410c" },
    dark: { base: "#115e59", a: "#0f766e", b: "#134e4a", ink: "#99f6e4" },
  }[tone];
  const drift = (speed: number, range: number, phase = 0) => Math.sin(frame / speed + phase) * range;
  const marks = [
    { x: 150, y: 230, kind: "plus", s: 46, p: 0 },
    { x: 930, y: 330, kind: "ring", s: 54, p: 1.3 },
    { x: 880, y: 1500, kind: "plus", s: 40, p: 2.1 },
    { x: 120, y: 1380, kind: "ring", s: 70, p: 0.6 },
    { x: 560, y: 150, kind: "dot", s: 22, p: 2.7 },
    { x: 980, y: 900, kind: "dot", s: 18, p: 1.9 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: palette.base, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: 450,
          background: palette.a,
          opacity: tone === "light" || tone === "warm" ? 0.55 : 0.28,
          left: -340 + drift(60, 40),
          top: -300 + drift(75, 30, 1),
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 820,
          height: 820,
          borderRadius: 410,
          background: palette.b,
          opacity: tone === "light" || tone === "warm" ? 0.6 : 0.35,
          right: -320 + drift(70, 36, 2),
          bottom: -260 + drift(55, 44, 0.5),
          filter: "blur(40px)",
        }}
      />
      {marks.map((m, i) => {
        const y = m.y + drift(38 + i * 7, 22, m.p);
        const rotate = interpolate(frame, [0, 600], [0, 90 + i * 20]);
        const common: React.CSSProperties = { position: "absolute", left: m.x, top: y, opacity: 0.32 };
        if (m.kind === "dot") {
          return <div key={i} style={{ ...common, width: m.s, height: m.s, borderRadius: m.s, background: palette.ink }} />;
        }
        if (m.kind === "ring") {
          return (
            <div
              key={i}
              style={{ ...common, width: m.s, height: m.s, borderRadius: m.s, border: `7px solid ${palette.ink}` }}
            />
          );
        }
        return (
          <svg key={i} width={m.s} height={m.s} viewBox="0 0 24 24" style={{ ...common, transform: `rotate(${rotate}deg)` }}>
            <path d="M12 4v16M4 12h16" stroke={palette.ink} strokeWidth="3.4" strokeLinecap="round" />
          </svg>
        );
      })}
    </div>
  );
};
