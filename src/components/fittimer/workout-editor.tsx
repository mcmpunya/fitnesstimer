"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  Timer,
  Coffee,
  RotateCcw,
  Repeat,
  Plus,
  Trash2,
  Copy,
  Zap,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NumberStepper } from "./number-stepper";
import { uid, useFitTimerStore } from "@/lib/store";
import { buildSegments, totalWorkoutSeconds } from "@/lib/timeline";
import { formatClock, type Step, type Workout } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WorkoutEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null => create new */
  workout: Workout | null;
}

type Draft = Omit<Workout, "id" | "createdAt" | "updatedAt">;

function emptyDraft(): Draft {
  return {
    name: "",
    prepDuration: 10,
    restDuration: 15,
    restBetweenRounds: 30,
    rounds: 3,
    steps: [{ id: uid(), label: "", duration: 30, type: "work" }],
  };
}

export function WorkoutEditor({ open, onOpenChange, workout }: WorkoutEditorProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[94dvh] p-0 flex flex-col rounded-t-2xl">
        {/* Mounted fresh every time the sheet opens — lazy state init below */}
        {open ? (
          <EditorForm
            key={workout?.id ?? "new"}
            initial={workout}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditorForm({
  initial,
  onDone,
}: {
  initial: Workout | null;
  onDone: () => void;
}) {
  const { addWorkout, updateWorkout } = useFitTimerStore();
  const [draft, setDraft] = useState<Draft>(() => {
    if (!initial) return emptyDraft();
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = initial;
    return structuredClone(rest);
  });
  const [error, setError] = useState<string | null>(null);

  const totalSec = useMemo(
    () => totalWorkoutSeconds({ ...draft, id: "x", createdAt: 0, updatedAt: 0 }),
    [draft]
  );
  const segCount = useMemo(
    () => buildSegments({ ...draft, id: "x", createdAt: 0, updatedAt: 0 }).length,
    [draft]
  );

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchStep = (id: string, p: Partial<Step>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...p } : s)) }));

  const moveStep = (index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const steps = [...d.steps];
      const j = index + dir;
      if (j < 0 || j >= steps.length) return d;
      [steps[index], steps[j]] = [steps[j], steps[index]];
      return { ...d, steps };
    });
  };

  const removeStep = (id: string) =>
    setDraft((d) => ({ ...d, steps: d.steps.filter((s) => s.id !== id) }));

  const duplicateStep = (id: string) =>
    setDraft((d) => {
      const i = d.steps.findIndex((s) => s.id === id);
      if (i < 0) return d;
      const steps = [...d.steps];
      steps.splice(i + 1, 0, { ...d.steps[i], id: uid() });
      return { ...d, steps };
    });

  const handleSave = () => {
    const steps = draft.steps
      .map((s, i) => ({
        ...s,
        label: s.label.trim() || (s.type === "rest" ? `Rest ${i + 1}` : `Exercise ${i + 1}`),
        duration: Math.max(1, Math.round(s.duration)),
      }))
      .filter((s) => s.duration > 0);

    if (steps.length === 0) {
      setError("Add at least one exercise step.");
      return;
    }
    const clean = { ...draft, name: draft.name.trim() || "Untitled Workout", steps };
    if (initial) updateWorkout(initial.id, clean);
    else addWorkout(clean);
    onDone();
  };

  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
        <SheetTitle>{initial ? "Edit workout" : "New workout"}</SheetTitle>
        <SheetDescription>
          Set durations, rounds and the text shown for every step.
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="space-y-5 pb-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="workout-name">Workout name</Label>
            <Input
              id="workout-name"
              placeholder="e.g. Morning Tabata"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              maxLength={60}
            />
          </div>

          {/* Timing config */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5" aria-hidden /> Start countdown
              </Label>
              <NumberStepper
                value={draft.prepDuration}
                onChange={(v) => patch({ prepDuration: v })}
                min={0}
                max={120}
                step={5}
                suffix="s"
                ariaLabel="Start countdown seconds"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Repeat className="h-3.5 w-3.5" aria-hidden /> Rounds
              </Label>
              <NumberStepper
                value={draft.rounds}
                onChange={(v) => patch({ rounds: v })}
                min={1}
                max={50}
                step={1}
                suffix="x"
                ariaLabel="Number of rounds"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coffee className="h-3.5 w-3.5" aria-hidden /> Rest between exercises
              </Label>
              <NumberStepper
                value={draft.restDuration}
                onChange={(v) => patch({ restDuration: v })}
                min={0}
                max={600}
                step={5}
                suffix="s"
                ariaLabel="Rest between exercises seconds"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rest between rounds
              </Label>
              <NumberStepper
                value={draft.restBetweenRounds}
                onChange={(v) => patch({ restBetweenRounds: v })}
                min={0}
                max={600}
                step={5}
                suffix="s"
                ariaLabel="Rest between rounds seconds"
              />
            </div>
          </div>

          <Separator />

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exercise steps ({draft.steps.length})</Label>
              <span className="text-xs text-muted-foreground">
                {segCount} segments · {formatClock(totalSec)} total
              </span>
            </div>

            <ul className="space-y-2.5">
              {draft.steps.map((step, i) => (
                <li
                  key={step.id}
                  className={cn(
                    "rounded-xl border p-3 space-y-2.5",
                    step.type === "rest"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-emerald-500/40 bg-emerald-500/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                        step.type === "rest" ? "bg-amber-500" : "bg-emerald-600"
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <Input
                      value={step.label}
                      onChange={(e) => patchStep(step.id, { label: e.target.value })}
                      placeholder={step.type === "rest" ? "Rest" : "e.g. Jumping Jacks"}
                      aria-label={`Step ${i + 1} name`}
                      maxLength={40}
                      className="h-9"
                    />
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Move step ${i + 1} up`}
                        disabled={i === 0}
                        onClick={() => moveStep(i, -1)}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Move step ${i + 1} down`}
                        disabled={i === draft.steps.length - 1}
                        onClick={() => moveStep(i, 1)}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Type toggle */}
                    <div
                      className="flex overflow-hidden rounded-lg border shrink-0"
                      role="group"
                      aria-label={`Step ${i + 1} type`}
                    >
                      <button
                        type="button"
                        aria-pressed={step.type === "work"}
                        onClick={() => patchStep(step.id, { type: "work" })}
                        className={cn(
                          "flex h-10 items-center gap-1 px-2.5 text-xs font-medium transition-colors",
                          step.type === "work"
                            ? "bg-emerald-600 text-white"
                            : "bg-background text-muted-foreground"
                        )}
                      >
                        <Dumbbell className="h-3.5 w-3.5" aria-hidden /> Work
                      </button>
                      <button
                        type="button"
                        aria-pressed={step.type === "rest"}
                        onClick={() => patchStep(step.id, { type: "rest" })}
                        className={cn(
                          "flex h-10 items-center gap-1 px-2.5 text-xs font-medium transition-colors",
                          step.type === "rest"
                            ? "bg-amber-500 text-white"
                            : "bg-background text-muted-foreground"
                        )}
                      >
                        <Coffee className="h-3.5 w-3.5" aria-hidden /> Rest
                      </button>
                    </div>

                    <NumberStepper
                      value={step.duration}
                      onChange={(v) => patchStep(step.id, { duration: v })}
                      min={1}
                      max={3600}
                      step={5}
                      suffix="s"
                      ariaLabel={`Step ${i + 1} duration`}
                      className="flex-1"
                    />

                    <div className="flex shrink-0 flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-8"
                        aria-label={`Duplicate step ${i + 1}`}
                        onClick={() => duplicateStep(step.id)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-8 text-destructive"
                        aria-label={`Delete step ${i + 1}`}
                        disabled={draft.steps.length <= 1}
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-emerald-600/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    steps: [...d.steps, { id: uid(), label: "", duration: 30, type: "work" }],
                  }))
                }
              >
                <Plus className="h-4 w-4" aria-hidden /> Exercise
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    steps: [...d.steps, { id: uid(), label: "", duration: 15, type: "rest" }],
                  }))
                }
              >
                <Plus className="h-4 w-4" aria-hidden /> Rest step
              </Button>
            </div>
          </div>

          {/* Live summary */}
          <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Sequence preview
            </p>
            <p>
              Start countdown {draft.prepDuration}s, then {draft.rounds} round
              {draft.rounds > 1 ? "s" : ""} of {draft.steps.length} step
              {draft.steps.length !== 1 ? "s" : ""} with {draft.restDuration}s rest between
              exercises and {draft.restBetweenRounds}s between rounds. Total{" "}
              <span className="font-semibold text-foreground">{formatClock(totalSec)}</span>.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background/95 backdrop-blur p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12" onClick={onDone}>
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
          >
            Save workout
          </Button>
        </div>
      </div>
    </>
  );
}
