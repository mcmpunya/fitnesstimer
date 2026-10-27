"use client";

/**
 * Screen Wake Lock hook — keeps the phone screen on while training.
 * Automatically re-acquires the lock when the tab becomes visible again.
 */
import { useCallback, useEffect, useRef } from "react";

type WakeLockSentinelLike = {
  released: boolean;
  addEventListener: (type: string, cb: () => void) => void;
  release: () => Promise<void>;
};

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  const request = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel as unknown as WakeLockSentinelLike;
      sentinel.addEventListener("release", () => {
        sentinelRef.current = null;
      });
    } catch {
      /* denied or unsupported — ignore */
    }
  }, []);

  const release = useCallback(async () => {
    const s = sentinelRef.current;
    sentinelRef.current = null;
    if (s && !s.released) {
      try {
        await s.release();
      } catch {
        /* no-op */
      }
    }
  }, []);

  // Acquire / release when `active` changes
  useEffect(() => {
    if (active) void request();
    else void release();
    return () => {
      void release();
    };
  }, [active, request, release]);

  // Re-acquire after tab becomes visible again (Android Chrome drops the lock)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && active) {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, request]);
}
