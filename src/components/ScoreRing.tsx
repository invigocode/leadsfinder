import type { Tier } from "@/lib/types";

const COLOR: Record<Tier, string> = { hot: "#1E8A57", warm: "#C98A00", cold: "#8A958F" };
export const TIER_LABEL: Record<Tier, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export function ScoreRing({ score, tier, size = 60 }: { score: number; tier: Tier; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Lead score ${score} out of 100, ${TIER_LABEL[tier]}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D9DFDA" strokeWidth="5" />
        <circle
          key={score}
          className="score-arc"
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLOR[tier]} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          style={{ ["--circ" as string]: circ }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold tabular-nums">{score}</span>
    </div>
  );
}
