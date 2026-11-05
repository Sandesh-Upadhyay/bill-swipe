import * as React from "react";
import { cn, hashString } from "@/lib/utils";

const BACKGROUNDS: [string, string][] = [
  ["#0f3d30", "#2fbf8f"],
  ["#123247", "#4fb3d9"],
  ["#3d2a12", "#e0a24a"],
  ["#2a1f3d", "#9b7be0"],
  ["#3d1520", "#e46a85"],
  ["#173d2b", "#a6e3a1"],
  ["#1d2b3d", "#7ea8e0"],
  ["#3b3412", "#d9c45a"],
];
const SKIN = ["#f5d3b8", "#e8b896", "#d9a273", "#c08456", "#a0673f", "#8a5634"];
const HAIR = ["#1b1410", "#3a2416", "#6b4423", "#a8743a", "#d4b07a", "#2b2b2b", "#8a3b22"];
const SHIRT = ["#e8f5ef", "#0f2a22", "#f1e4d0", "#d6e6f5", "#1c3550", "#f4d9de", "#2d4a3a"];

/**
 * Generated, fictional profile illustration (no real photographs are used in the demo).
 * Pass a data: URL to render an uploaded profile photo instead.
 */
export function DemoAvatar({
  seed,
  className,
  rounded = "full",
  label,
}: {
  seed: string;
  className?: string;
  rounded?: "full" | "2xl" | "none";
  label?: string;
}) {
  const radius = rounded === "full" ? "rounded-full" : rounded === "2xl" ? "rounded-2xl" : "";
  if (seed.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={seed} alt={label ?? "Profile photo"} className={cn("size-10 object-cover", radius, className)} />
    );
  }
  const h = hashString(seed);
  const [bg1, bg2] = BACKGROUNDS[h % BACKGROUNDS.length];
  const skin = SKIN[(h >>> 3) % SKIN.length];
  const hair = HAIR[(h >>> 6) % HAIR.length];
  const shirt = SHIRT[(h >>> 9) % SHIRT.length];
  const style = (h >>> 12) % 5;
  const id = `g${h.toString(36)}`;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label ?? "Fictional profile illustration"}
      className={cn("size-10 shrink-0 overflow-hidden", radius, className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {/* long hair behind */}
      {(style === 1 || style === 3) && <path d="M28 44c0-18 10-27 22-27s22 9 22 27v28H28z" fill={hair} />}
      {/* shoulders */}
      <path d="M14 100c2-20 16-30 36-30s34 10 36 30z" fill={shirt} />
      {/* neck */}
      <rect x="43" y="56" width="14" height="17" rx="6" fill={skin} />
      <path d="M43 66c4 3 10 3 14 0v4c-4 3-10 3-14 0z" fill="#000" opacity="0.08" />
      {/* head */}
      <ellipse cx="50" cy="44" rx="16" ry="18" fill={skin} />
      {/* hair styles */}
      {style === 0 && <path d="M33 41c0-12 7-19 17-19s17 7 17 19c-3-6-9-9-17-9s-14 3-17 9z" fill={hair} />}
      {style === 1 && <path d="M33 43c0-13 7-20 17-20s17 7 17 20c-4-8-10-11-17-11s-13 3-17 11z" fill={hair} />}
      {style === 2 && (
        <g fill={hair}>
          <circle cx="50" cy="20" r="7" />
          <path d="M33 41c0-12 7-18 17-18s17 6 17 18c-4-5-9-8-17-8s-13 3-17 8z" />
        </g>
      )}
      {style === 3 && <path d="M34 40c2-11 8-17 16-17 9 0 15 6 16 17-6-3-10-8-12-12-4 7-11 11-20 12z" fill={hair} />}
      {style === 4 && (
        <g fill={hair}>
          <circle cx="38" cy="32" r="7" />
          <circle cx="47" cy="26" r="8" />
          <circle cx="57" cy="27" r="8" />
          <circle cx="64" cy="34" r="6" />
        </g>
      )}
      {/* face */}
      <g fill="#2a1a12" opacity="0.85">
        <ellipse cx="44" cy="46" rx="1.6" ry="2" />
        <ellipse cx="56" cy="46" rx="1.6" ry="2" />
      </g>
      <path d="M45.5 53c2.6 2.2 6.4 2.2 9 0" fill="none" stroke="#2a1a12" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="40.5" cy="51" rx="2.6" ry="1.6" fill="#e86a6a" opacity="0.18" />
      <ellipse cx="59.5" cy="51" rx="2.6" ry="1.6" fill="#e86a6a" opacity="0.18" />
      {/* subtle light */}
      <ellipse cx="45" cy="38" rx="6" ry="4" fill="#fff" opacity="0.1" />
    </svg>
  );
}
