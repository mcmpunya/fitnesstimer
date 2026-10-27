"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2, Mic, Vibrate, Timer, MonitorUp, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFitTimerStore } from "@/lib/store";
import { soundEngine } from "@/lib/sounds";
import { SOUND_LABELS, type SoundId } from "@/lib/types";

const SOUND_IDS: SoundId[] = [
  "chime",
  "beep",
  "bell",
  "buzzer",
  "digital",
  "marimba",
  "whistle",
  "none",
];

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { settings, updateSettings, resetAll } = useFitTimerStore();
  const [previewing, setPreviewing] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      soundEngine.stopSpeech();
    };
  }, []);

  const previewSound = (id: SoundId) => {
    soundEngine.unlock();
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setPreviewing(true);
    soundEngine.play(id, settings.volume, "complete");
    previewTimer.current = setTimeout(() => setPreviewing(false), 1400);
  };

  const handleReset = () => {
    if (confirm("Reset all workouts and settings to defaults? This cannot be undone.")) {
      resetAll();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[88dvh] p-0 flex flex-col rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Sound, alerts and workout behaviour.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="max-h-[calc(88dvh-120px)]">
          <div className="space-y-5 px-4 pb-6">
            {/* Alarm sound */}
            <section className="space-y-2" aria-label="Alarm sound">
              <Label className="text-sm">Alarm sound</Label>
              <div className="flex gap-2">
                <Select
                  value={settings.soundId}
                  onValueChange={(v) => {
                    updateSettings({ soundId: v as SoundId });
                    if (v !== "none") {
                      // small deferred so the select closes first
                      setTimeout(() => previewSound(v as SoundId), 150);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 flex-1" aria-label="Alarm sound">
                    <SelectValue placeholder="Pick a sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_IDS.map((id) => (
                      <SelectItem key={id} value={id}>
                        {SOUND_LABELS[id]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label={previewing ? "Stop preview" : "Preview alarm sound"}
                  disabled={settings.soundId === "none"}
                  onClick={() => (previewing ? (soundEngine.stopSpeech(), setPreviewing(false)) : previewSound(settings.soundId))}
                >
                  {previewing ? <Square className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                </Button>
              </div>
            </section>

            {/* Volume */}
            <section className="space-y-2" aria-label="Volume">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Volume2 className="h-4 w-4" aria-hidden /> Volume
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => updateSettings({ volume: v })}
                onValueCommit={() => soundEngine.tick(settings.volume, true)}
                aria-label="Alarm volume"
              />
            </section>

            <Separator />

            {/* Toggles */}
            <section className="space-y-4" aria-label="Alerts">
              <Row
                icon={<Mic className="h-4 w-4" aria-hidden />}
                title="Voice announcements"
                desc="Speaks each exercise name aloud"
                checked={settings.voice}
                onChange={(v) => updateSettings({ voice: v })}
              />
              <Row
                icon={<Vibrate className="h-4 w-4" aria-hidden />}
                title="Vibration"
                desc="Buzz on phase changes (mobile)"
                checked={settings.vibrate}
                onChange={(v) => updateSettings({ vibrate: v })}
              />
              <Row
                icon={<Timer className="h-4 w-4" aria-hidden />}
                title="End-of-set countdown"
                desc="Beeps + big 3-2-1 before each switch"
                checked={settings.endCountdown}
                onChange={(v) => updateSettings({ endCountdown: v })}
              />
              <Row
                icon={<MonitorUp className="h-4 w-4" aria-hidden />}
                title="Keep screen awake"
                desc="Stops your phone sleeping mid-workout"
                checked={settings.keepAwake}
                onChange={(v) => updateSettings({ keepAwake: v })}
              />
            </section>

            <Separator />

            <section className="space-y-2" aria-label="Data">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Reset app data</p>
                  <p className="text-xs text-muted-foreground">
                    Restores sample workouts and default settings. Saved on this device only.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
