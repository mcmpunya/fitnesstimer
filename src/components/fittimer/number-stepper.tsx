"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** suffix shown inside the value area, e.g. "s" */
  suffix?: string;
  ariaLabel?: string;
  className?: string;
}

/** Mobile-friendly +/- numeric control with big touch targets. */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 5,
  suffix,
  ariaLabel = "Value",
  className,
}: NumberStepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-lg border bg-background ${className ?? ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-none shrink-0"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <div className="flex min-w-[64px] flex-1 items-center justify-center gap-0.5 border-x px-1">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
            onChange(clamp(isNaN(n) ? min : n));
          }}
          className="w-full min-w-0 bg-transparent text-center text-base font-semibold tabular-nums outline-none"
        />
        {suffix ? <span className="text-xs text-muted-foreground shrink-0">{suffix}</span> : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-none shrink-0"
        aria-label={`Increase ${ariaLabel}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
