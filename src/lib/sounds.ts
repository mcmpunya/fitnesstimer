/**
 * FitTimer sound engine.
 * All alarm sounds are synthesized with the Web Audio API so the app
 * works fully offline with zero audio assets. Also provides voice
 * announcements via the SpeechSynthesis API and vibration patterns.
 */
import type { SoundId } from "./types";

class SoundEngine {
  private ctx: AudioContext | null = null;

  /** Must be called from a user gesture (iOS/Safari requirement). */
  unlock() {
    if (typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* audio unsupported — stay silent */
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Schedule a single tone. */
  private tone(
    ctx: AudioContext,
    opts: {
      type: OscillatorType;
      freq: number;
      endFreq?: number;
      start: number;
      dur: number;
      gain: number;
      attack?: number;
    }
  ) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type;
    const t0 = ctx.currentTime + opts.start;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.endFreq && opts.endFreq !== opts.freq) {
      osc.frequency.exponentialRampToValueAtTime(opts.endFreq, t0 + opts.dur);
    }
    const attack = opts.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.gain, 0.0002), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  /**
   * Play an alarm pattern for the given sound.
   * `mode` = "start" (segment begins) | "end" (segment ending tick) | "complete"
   */
  play(soundId: SoundId, volume: number, mode: "start" | "complete" = "start") {
    if (soundId === "none" || volume <= 0) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const v = Math.min(1, Math.max(0, volume));

    const reps = mode === "complete" ? 3 : 1;
    const gap = 0.28;

    switch (soundId) {
      case "beep":
        for (let i = 0; i < reps; i++) {
          this.tone(ctx, { type: "square", freq: 880, start: i * gap, dur: 0.14, gain: 0.16 * v });
          this.tone(ctx, { type: "square", freq: 1320, start: i * gap + 0.15, dur: 0.1, gain: 0.12 * v });
        }
        break;
      case "chime":
        [523.25, 659.25, 783.99].forEach((f, i) => {
          for (let r = 0; r < reps; r++)
            this.tone(ctx, { type: "sine", freq: f, start: r * gap + i * 0.09, dur: 0.42, gain: 0.18 * v });
        });
        break;
      case "bell":
        for (let i = 0; i < reps; i++) {
          this.tone(ctx, { type: "sine", freq: 1568, start: i * gap, dur: 0.8, gain: 0.2 * v });
          this.tone(ctx, { type: "sine", freq: 784, start: i * gap, dur: 0.8, gain: 0.12 * v });
          this.tone(ctx, { type: "sine", freq: 2093, start: i * gap, dur: 0.4, gain: 0.05 * v });
        }
        break;
      case "buzzer":
        for (let i = 0; i < reps; i++) {
          this.tone(ctx, { type: "sawtooth", freq: 196, start: i * gap, dur: 0.22, gain: 0.16 * v });
          this.tone(ctx, { type: "sawtooth", freq: 200.5, start: i * gap, dur: 0.22, gain: 0.16 * v });
        }
        break;
      case "digital":
        for (let i = 0; i < reps * 2; i++)
          this.tone(ctx, { type: "square", freq: 1244.5, start: i * 0.11, dur: 0.07, gain: 0.14 * v });
        break;
      case "marimba":
        [523.25, 1046.5].forEach((f, i) => {
          for (let r = 0; r < reps; r++)
            this.tone(ctx, { type: "sine", freq: f, start: r * gap + i * 0.1, dur: 0.3, gain: (i ? 0.08 : 0.2) * v });
        });
        break;
      case "whistle":
        for (let i = 0; i < reps; i++)
          this.tone(ctx, { type: "sine", freq: 1800, endFreq: 2500, start: i * gap, dur: 0.22, gain: 0.15 * v });
        break;
    }
  }

  /** Short soft tick used during the 3-2-1 end-of-segment countdown. */
  tick(volume: number, high = false) {
    if (volume <= 0) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const v = Math.min(1, Math.max(0, volume));
    this.tone(ctx, {
      type: "sine",
      freq: high ? 1200 : 820,
      start: 0,
      dur: 0.09,
      gain: 0.14 * v,
      attack: 0.002,
    });
  }

  /** Speak an announcement (e.g. exercise name, "Rest", "Workout complete"). */
  speak(text: string, volume: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (volume <= 0 || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1;
      u.volume = Math.min(1, Math.max(0, volume));
      window.speechSynthesis.speak(u);
    } catch {
      /* no-op */
    }
  }

  stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* no-op */
      }
    }
  }

  /** Fire a vibration pattern (no-op on unsupported devices). */
  vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* no-op */
      }
    }
  }
}

export const soundEngine = new SoundEngine();
