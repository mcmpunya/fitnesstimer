"use client";

/** Big circular SVG progress ring used by the timer. */
interface TimerRingProps {
  /** 0..1 — fraction of the segment elapsed */
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  trackClass?: string;
  children?: React.ReactNode;
}

export function TimerRing({
  progress,
  size = 280,
  stroke = 14,
  color,
  trackClass = "text-border",
  children,
}: TimerRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={`stroke-current ${trackClass}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear, stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
