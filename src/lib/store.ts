"use client";

/**
 * FitTimer global store — workouts + settings, persisted to localStorage.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Settings, Workout } from "./types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const DEFAULT_SETTINGS: Settings = {
  soundId: "chime",
  volume: 0.8,
  voice: true,
  vibrate: true,
  endCountdown: true,
  keepAwake: true,
};

function makeStep(label: string, duration: number) {
  return { id: uid(), label, duration, type: "work" as const };
}

function seedWorkout(): Workout {
  const now = Date.now();
  return {
    id: "seed-tabata",
    name: "Tabata Classic",
    prepDuration: 10,
    restDuration: 10,
    restBetweenRounds: 20,
    rounds: 4,
    steps: [
      makeStep("Jumping Jacks", 20),
      makeStep("Push-ups", 20),
      makeStep("Bodyweight Squats", 20),
      makeStep("Plank", 20),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function seedWorkout2(): Workout {
  const now = Date.now();
  return {
    id: "seed-hiit",
    name: "HIIT Starter",
    prepDuration: 15,
    restDuration: 30,
    restBetweenRounds: 60,
    rounds: 3,
    steps: [
      makeStep("High Knees", 40),
      makeStep("Mountain Climbers", 40),
      makeStep("Burpees", 30),
    ],
    createdAt: now - 1,
    updatedAt: now - 1,
  };
}

interface FitTimerState {
  workouts: Workout[];
  settings: Settings;
  addWorkout: (w: Omit<Workout, "id" | "createdAt" | "updatedAt">) => Workout;
  updateWorkout: (id: string, w: Partial<Omit<Workout, "id">>) => void;
  deleteWorkout: (id: string) => void;
  duplicateWorkout: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetAll: () => void;
}

export const useFitTimerStore = create<FitTimerState>()(
  persist(
    (set, get) => ({
      workouts: [seedWorkout(), seedWorkout2()],
      settings: DEFAULT_SETTINGS,

      addWorkout: (w) => {
        const now = Date.now();
        const workout: Workout = { ...w, id: uid(), createdAt: now, updatedAt: now };
        set({ workouts: [workout, ...get().workouts] });
        return workout;
      },

      updateWorkout: (id, w) =>
        set({
          workouts: get().workouts.map((x) =>
            x.id === id ? { ...x, ...w, id, updatedAt: Date.now() } : x
          ),
        }),

      deleteWorkout: (id) =>
        set({ workouts: get().workouts.filter((x) => x.id !== id) }),

      duplicateWorkout: (id) => {
        const src = get().workouts.find((x) => x.id === id);
        if (!src) return;
        const now = Date.now();
        const copy: Workout = {
          ...src,
          id: uid(),
          name: `${src.name} (copy)`,
          createdAt: now,
          updatedAt: now,
          steps: src.steps.map((s) => ({ ...s, id: uid() })),
        };
        set({ workouts: [copy, ...get().workouts] });
      },

      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      resetAll: () => set({ workouts: [seedWorkout(), seedWorkout2()], settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "fittimer-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

export { uid };
