/**
 * Builds the ordered list of timer segments for a workout:
 * prepare -> [ round: work -> rest ... ] -> complete
 */
import type { Segment, Workout } from "./types";

export function buildSegments(workout: Workout): Segment[] {
  const segments: Segment[] = [];
  const rounds = Math.max(1, workout.rounds);
  const steps = workout.steps.filter((s) => s.duration > 0);

  if (workout.prepDuration > 0) {
    segments.push({
      kind: "prepare",
      label: "Get Ready",
      duration: workout.prepDuration,
      round: 1,
      totalRounds: rounds,
      stepIndex: 0,
      speak: "Get ready",
    });
  }

  for (let r = 1; r <= rounds; r++) {
    steps.forEach((step, i) => {
      const isLastStepOfRound = i === steps.length - 1;
      const isLastRound = r === rounds;

      segments.push({
        kind: step.type === "rest" ? "rest" : "work",
        label: step.label || (step.type === "rest" ? "Rest" : "Exercise"),
        duration: step.duration,
        round: r,
        totalRounds: rounds,
        stepIndex: i,
        speak: step.label || undefined,
      });

      // Rest AFTER this step?
      const isFinalSegmentOverall = isLastStepOfRound && isLastRound;
      if (isFinalSegmentOverall) return;

      let restDur: number;
      let kind: Segment["kind"] = "rest";
      let label = "Rest";
      if (isLastStepOfRound) {
        // rest between rounds
        restDur = workout.restBetweenRounds > 0 ? workout.restBetweenRounds : workout.restDuration;
        kind = "round-rest";
        label = rounds > 1 ? `Round ${r} done — Rest` : "Rest";
      } else {
        restDur = workout.restDuration;
      }
      if (restDur > 0) {
        segments.push({
          kind,
          label,
          duration: restDur,
          round: r,
          totalRounds: rounds,
          stepIndex: i,
          speak: "Rest",
        });
      }
    });
  }

  return segments;
}

export function totalWorkoutSeconds(workout: Workout): number {
  return buildSegments(workout).reduce((acc, s) => acc + s.duration, 0);
}

/** Short human summary, e.g. "3 rounds × 4 exercises · 12:30" */
export function workoutSummary(workout: Workout): string {
  const n = workout.steps.length;
  const total = totalWorkoutSeconds(workout);
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  const time = `${m}:${s.toString().padStart(2, "0")}`;
  return `${workout.rounds} round${workout.rounds > 1 ? "s" : ""} × ${n} exercise${n !== 1 ? "s" : ""} · ${time}`;
}

/** The next up-coming exercise label given current segment index. */
export function nextWorkLabel(segments: Segment[], currentIndex: number): string | null {
  for (let i = currentIndex + 1; i < segments.length; i++) {
    if (segments[i].kind === "work") return segments[i].label;
  }
  return null;
}
