"use client";

import { useState, useSyncExternalStore } from "react";
import { Settings2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/fittimer/theme-toggle";
import { PwaRegister } from "@/components/fittimer/pwa-register";
import { WorkoutList } from "@/components/fittimer/workout-list";
import { WorkoutEditor } from "@/components/fittimer/workout-editor";
import { SettingsSheet } from "@/components/fittimer/settings-sheet";
import { TimerView } from "@/components/fittimer/timer-view";
import { useFitTimerStore } from "@/lib/store";
import { soundEngine } from "@/lib/sounds";
import type { Workout } from "@/lib/types";

const emptySubscribe = () => () => {};

export default function Home() {
  const [view, setView] = useState<"home" | "timer">("home");
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = useFitTimerStore();

  // True only on the client — avoids hydration mismatch with persisted localStorage state
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const handleStart = (w: Workout) => {
    soundEngine.unlock(); // must happen inside the user gesture
    setActiveWorkout(w);
    setView("timer");
  };

  const handleEdit = (w: Workout | null) => {
    setEditing(w);
    setEditorOpen(true);
  };

  const exitTimer = () => {
    setView("home");
    setActiveWorkout(null);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Timer className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold tracking-tight">FitTimer</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">
                Interval workout timer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <PwaRegister />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label="Open settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {mounted ? (
          <WorkoutList onStart={handleStart} onEdit={handleEdit} />
        ) : (
          <div className="space-y-3" aria-hidden>
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Works offline · Saved on this device ·{" "}
          {settings.keepAwake ? "Screen stays awake" : "Screen awake off"}
        </p>
      </main>

      {/* Sheets & overlays */}
      <WorkoutEditor open={editorOpen} onOpenChange={setEditorOpen} workout={editing} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

      {view === "timer" && activeWorkout ? (
        <TimerView workout={activeWorkout} onExit={exitTimer} />
      ) : null}
    </div>
  );
}
