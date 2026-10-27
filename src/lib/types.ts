/** Core domain types for FitTimer */

export type StepType = "work" | "rest";

export interface Step {
  id: string;
  /** Display label, e.g. "Jumping Jacks" */
  label: string;
  /** Duration in seconds */
  duration: number;
  type: StepType;
}

export interface Workout {
  id: string;
  name: string;
  /** Countdown before the workout starts (seconds) */
  prepDuration: number;
  /** Rest after each exercise step (seconds) */
  restDuration: number;
  /** Extra/alternative rest between full rounds (seconds). 0 = use restDuration */
  restBetweenRounds: number;
  /** How many times the whole step list repeats */
  rounds: number;
  steps: Step[];
  createdAt: number;
  updatedAt: number;
}

export type SegmentKind = "prepare" | "work" | "rest" | "round-rest" | "complete";

export interface Segment {
  kind: SegmentKind;
  label: string;
  /** Duration in seconds */
  duration: number;
  /** 1-based round number this segment belongs to */
  round: number;
  totalRounds: number;
  /** Index of the exercise within the round (for work segments) */
  stepIndex: number;
  /** Spoken announcement text (optional) */
  speak?: string;
}

export type SoundId =
  | "none"
  | "beep"
  | "chime"
  | "bell"
  | "buzzer"
  | "digital"
  | "marimba"
  | "whistle";

export interface Settings {
  soundId: SoundId;
  /** 0..1 */
  volume: number;
  /** Voice announcements of step names */
  voice: boolean;
  /** Vibrate on transitions (mobile) */
  vibrate: boolean;
  /** Tick + on-screen countdown during the last 3 seconds of each segment */
  endCountdown: boolean;
  /** Keep the screen awake during workouts (Wake Lock API) */
  keepAwake: boolean;
}

export const SOUND_LABELS: Record<SoundId, string> = {
  none: "Silent",
  beep: "Beep",
  chime: "Chime",
  bell: "Bell",
  buzzer: "Buzzer",
  digital: "Digital",
  marimba: "Marimba",
  whistle: "Whistle",
};

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
