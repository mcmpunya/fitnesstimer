"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Trophy,
  Flame,
  Coffee,
  Timer as TimerIcon,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimerRing } from "./timer-ring";
import { useFitTimerStore } from "@/lib/store";
import { soundEngine } from "@/lib/sounds";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { buildSegments, totalWorkoutSeconds } from "@/lib/timeline";
import { formatClock, type Segment, type Workout } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASE_STYLE: Record<
  Segment["kind"],
  { label: string; color: string; glow: string; chip: string }
> = {
  prepare: {
    label: "Get Ready",
    color: "#8b5cf6",
    glow: "139, 92, 246",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  },
  work: {
    label: "Work",
    color: "#10b981",
    glow: "16, 185, 129",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  rest: {
    label: "Rest",
    color: "#f59e0b",
    glow: "245, 158, 11",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  "round-rest": {
    label: "Round Rest",
    color: "#f59e0b",
    glow: "245, 158, 11",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  complete: {
    label: "Complete",
    color: "#10b981",
    glow: "16, 185, 129",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
};

interface TimerViewProps {
  workout: Workout;
  onExit: () => void;
}

export function TimerView({ workout, onExit }: TimerViewProps) {
  const settings = useFitTimerStore((s) => s.settings);
  const segments = useMemo(() => buildSegments(workout), [workout]);
  const totalPlanned = useMemo(() => totalWorkoutSeconds(workout), [workout]);

  // --- timer core (refs = source of truth, state = display) ---
  const segIndexRef = useRef(0);
  const elapsedRef = useRef(0); // seconds into current segment
  const totalElapsedRef = useRef(0);
  const lastWholeRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [segIndex, setSegIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);

  const wakeActive = settings.keepAwake && started && !done;
  useWakeLock(wakeActive);

  const seg: Segment = segments[Math.min(segIndex, segments.length - 1)] ?? {
    kind: "work",
    label: "—",
    duration: 1,
    round: 1,
    totalRounds: 1,
    stepIndex: 0,
  };
  const phase = PHASE_STYLE[done ? "complete" : seg.kind];

  const announceSegment = useCallback((s: Segment, isStart: boolean) => {
    const st = settingsRef.current;
    if (isStart) soundEngine.play(st.soundId, st.volume, "start");
    if (st.vibrate) {
      soundEngine.vibrate(s.kind === "work" ? [180, 80, 180] : [120]);
    }
    if (st.voice) {
      const text =
        s.kind === "prepare"
          ? "Get ready"
          : s.kind === "work"
            ? s.label
            : s.kind === "complete"
              ? "Workout complete. Great job!"
              : "Rest";
      setTimeout(() => soundEngine.speak(text, st.volume), 350);
    }
  }, []);

  const finish = useCallback(() => {
    const st = settingsRef.current;
    runningRef.current = false;
    setRunning(false);
    setDone(true);
    setCountdownNum(null);
    soundEngine.play(st.soundId, st.volume, "complete");
    if (st.vibrate) soundEngine.vibrate([300, 150, 300, 150, 500]);
    if (st.voice) soundEngine.speak("Workout complete. Great job!", st.volume);
  }, []);

  const goToSegment = useCallback(
    (index: number, opts: { signal?: boolean } = {}) => {
      const segs = segments;
      if (index >= segs.length) {
        finish();
        return;
      }
      segIndexRef.current = index;
      elapsedRef.current = 0;
      lastWholeRef.current = null;
      setSegIndex(index);
      setElapsed(0);
      setCountdownNum(null);
      if (opts.signal !== false) announceSegment(segs[index], true);
    },
    [segments, announceSegment, finish]
  );

  // Main animation loop — timestamp driven for accuracy
  useEffect(() => {
    if (!running || done) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000); // clamp: effectively pauses when hidden
      last = now;

      elapsedRef.current += dt;
      totalElapsedRef.current += dt;

      // advance segments if overshoot (handles lag spikes)
      let guard = 0;
      while (
        guard++ < 1000 &&
        elapsedRef.current >= segments[segIndexRef.current].duration
      ) {
        elapsedRef.current -= segments[segIndexRef.current].duration;
        const next = segIndexRef.current + 1;
        if (next >= segments.length) {
          elapsedRef.current = 0;
          totalElapsedRef.current = Math.min(totalElapsedRef.current, totalPlanned);
          setTotalElapsed(totalElapsedRef.current);
          finish();
          return;
        }
        segIndexRef.current = next;
        lastWholeRef.current = null;
        setCountdownNum(null);
        announceSegment(segments[next], true);
      }

      const cur = segments[segIndexRef.current];
      const remaining = cur.duration - elapsedRef.current;
      const whole = Math.ceil(remaining);
      const st = settingsRef.current;

      if (st.endCountdown && whole <= 3 && whole >= 1 && lastWholeRef.current !== whole) {
        lastWholeRef.current = whole;
        setCountdownNum(whole);
        soundEngine.tick(st.volume, whole === 1);
        if (st.vibrate) soundEngine.vibrate(40);
      } else if ((whole > 3 || !st.endCountdown) && lastWholeRef.current !== null) {
        lastWholeRef.current = null;
        setCountdownNum(null);
      }

      setElapsed(elapsedRef.current);
      setTotalElapsed(totalElapsedRef.current);
      setSegIndex(segIndexRef.current);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, done, segments, announceSegment, finish]);

  // Unlock audio engine on mount (arrives from a user gesture chain)
  useEffect(() => {
    soundEngine.unlock();
    return () => soundEngine.stopSpeech();
  }, []);

  const start = () => {
    soundEngine.unlock();
    setStarted(true);
    runningRef.current = true;
    setRunning(true);
    announceSegment(segments[segIndexRef.current], true);
  };

  const pause = () => {
    runningRef.current = false;
    setRunning(false);
    soundEngine.stopSpeech();
  };

  const resume = () => {
    runningRef.current = true;
    setRunning(true);
  };

  const skipForward = () => {
    if (done) return;
    goToSegment(segIndexRef.current + 1);
  };

  const skipBack = () => {
    if (done) return;
    if (elapsedRef.current > 1.5) {
      // restart current segment
      elapsedRef.current = 0;
      lastWholeRef.current = null;
      setElapsed(0);
      setCountdownNum(null);
    } else if (segIndexRef.current > 0) {
      goToSegment(segIndexRef.current - 1, { signal: false });
    }
  };

  const exit = () => {
    soundEngine.stopSpeech();
    onExit();
  };

  // ------- derived display -------
  const remaining = Math.max(0, seg.duration - elapsed);
  const progress = seg.duration > 0 ? elapsed / seg.duration : 0;
  const overall = totalPlanned > 0 ? Math.min(1, totalElapsed / totalPlanned) : 0;
  const nextSeg = segments[segIndex + 1];
  const showBigCountdown = settings.endCountdown && countdownNum !== null && running && !done;

  // ------- complete screen -------
  if (done) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-6 text-foreground"
        role="dialog"
        aria-label="Workout complete"
        style={{
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(${phase.glow}, 0.18), transparent 55%)`,
        }}
      >
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15">
          <Trophy className="h-14 w-14 text-emerald-500" aria-hidden />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Workout complete!</h2>
          <p className="text-muted-foreground">
            {workout.name} · {workout.rounds} round{workout.rounds > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col items-center rounded-2xl border px-6 py-4">
            <Flame className="mb-1 h-5 w-5 text-amber-500" aria-hidden />
            <span className="text-2xl font-bold tabular-nums">{formatClock(totalElapsed)}</span>
            <span className="text-xs text-muted-foreground">active time</span>
          </div>
          <div className="flex flex-col items-center rounded-2xl border px-6 py-4">
            <TimerIcon className="mb-1 h-5 w-5 text-emerald-500" aria-hidden />
            <span className="text-2xl font-bold tabular-nums">{formatClock(totalPlanned)}</span>
            <span className="text-xs text-muted-foreground">planned</span>
          </div>
        </div>
        <Button size="lg" className="h-14 w-full max-w-xs bg-emerald-600 text-white hover:bg-emerald-700" onClick={exit}>
          Back to workouts
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
      role="dialog"
      aria-label="Workout timer"
      style={{
        backgroundImage: `radial-gradient(ellipse at 50% -10%, rgba(${phase.glow}, 0.16), transparent 60%)`,
      }}
    >
      {/* safe-area padding top */}
      <div className="shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label="Exit timer"
            onClick={exit}
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
          <div className="text-center min-w-0">
            <p className="truncate text-sm font-semibold">{workout.name}</p>
            <p className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", phase.chip)}>
              Round {seg.round} / {seg.totalRounds}
            </p>
          </div>
          <div className="h-11 w-11" aria-hidden /> {/* spacer */}
        </div>
      </div>

      {/* Ring */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-5 px-6">
        <TimerRing progress={progress} color={phase.color} size={272} stroke={13}>
          {showBigCountdown ? (
            <div key={countdownNum} className="countdown-pop select-none">
              <span
                className="block text-[110px] font-black leading-none tabular-nums"
                style={{ color: phase.color }}
                aria-live="assertive"
              >
                {countdownNum}
              </span>
            </div>
          ) : (
            <>
              <span
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: phase.color }}
              >
                {seg.kind === "work" ? seg.label : phase.label}
              </span>
              <span className="mt-1 text-6xl font-bold tabular-nums" aria-live="assertive" aria-atomic>
                {formatClock(remaining)}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {seg.kind === "prepare"
                  ? "starting soon"
                  : seg.kind === "work"
                    ? "keep going"
                    : "catch your breath"}
              </span>
            </>
          )}
        </TimerRing>

        {/* Current + next */}
        <div className="text-center">
          <p className="text-2xl font-bold leading-tight" aria-live="polite">
            {seg.kind === "prepare" ? "Get Ready" : seg.label}
          </p>
          {nextSeg ? (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              Up next:
              {nextSeg.kind !== "work" && (
                <Coffee className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              )}
              <span className="font-medium text-foreground/80">{nextSeg.label}</span>
              <span>· {formatClock(nextSeg.duration)}</span>
            </p>
          ) : (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              Finish line <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>{formatClock(totalElapsed)}</span>
            <span>{Math.round(overall * 100)}% of workout</span>
            <span>-{formatClock(totalPlanned - totalElapsed)}</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(overall * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall workout progress"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-200 ease-linear"
              style={{ width: `${overall * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Previous segment"
            onClick={skipBack}
            disabled={!started}
          >
            <SkipBack className="h-5 w-5" aria-hidden />
          </Button>

          {!started ? (
            <Button
              className="h-20 w-20 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
              aria-label="Start workout"
              onClick={start}
            >
              <Play className="h-9 w-9 fill-current" aria-hidden />
            </Button>
          ) : running ? (
            <Button
              variant="outline"
              className="h-20 w-20 rounded-full border-2"
              aria-label="Pause"
              onClick={pause}
            >
              <Pause className="h-8 w-8" aria-hidden />
            </Button>
          ) : (
            <Button
              className="h-20 w-20 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
              aria-label="Resume"
              onClick={resume}
            >
              <Play className="h-9 w-9 fill-current" aria-hidden />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Next segment"
            onClick={skipForward}
            disabled={!started}
          >
            <SkipForward className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        {!started ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Press play — your screen will stay awake while you train.
          </p>
        ) : null}
      </div>
    </div>
  );
}
