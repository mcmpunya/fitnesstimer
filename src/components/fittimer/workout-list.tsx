"use client";

import { useState } from "react";
import {
  Play,
  Pencil,
  Trash2,
  Copy,
  Plus,
  Dumbbell,
  Clock3,
  Repeat,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFitTimerStore } from "@/lib/store";
import { workoutSummary } from "@/lib/timeline";
import type { Workout } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WorkoutListProps {
  onStart: (w: Workout) => void;
  onEdit: (w: Workout | null) => void;
}

export function WorkoutList({ onStart, onEdit }: WorkoutListProps) {
  const { workouts, deleteWorkout, duplicateWorkout } = useFitTimerStore();
  const [pendingDelete, setPendingDelete] = useState<Workout | null>(null);

  return (
    <div className="space-y-4">
      {workouts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Dumbbell className="h-8 w-8 text-emerald-500" aria-hidden />
          </div>
          <div>
            <p className="font-semibold">No workouts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first interval workout — it takes a minute.
            </p>
          </div>
          <Button
            className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => onEdit(null)}
          >
            <Plus className="h-4 w-4" aria-hidden /> New workout
          </Button>
        </div>
      ) : (
        <>
          <Button
            className="h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => onEdit(null)}
          >
            <Plus className="h-5 w-5" aria-hidden /> New workout
          </Button>

          <ul className="space-y-3" aria-label="Saved workouts">
            {workouts.map((w) => (
              <li key={w.id}>
                <Card className="overflow-hidden py-0">
                  <CardContent className="flex items-stretch gap-0 p-0">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-emerald-600"
                      onClick={() => onStart(w)}
                      aria-label={`Start ${w.name}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-base font-bold">{w.name}</span>
                      </span>
                      <span className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <Repeat className="h-3 w-3" aria-hidden /> {w.rounds}×
                        </Badge>
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <Dumbbell className="h-3 w-3" aria-hidden /> {w.steps.length} steps
                        </Badge>
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <Clock3 className="h-3 w-3" aria-hidden /> {workoutSummary(w).split("· ")[1]}
                        </Badge>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {w.steps.map((s) => s.label).join(" → ")}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 pr-2">
                      <Button
                        size="icon"
                        className="h-11 w-11 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                        aria-label={`Start ${w.name} now`}
                        onClick={() => onStart(w)}
                      >
                        <Play className="h-5 w-5 fill-current" aria-hidden />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-9"
                            aria-label={`More actions for ${w.name}`}
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onEdit(w)}>
                            <Pencil className="h-4 w-4" aria-hidden /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateWorkout(w.id)}>
                            <Copy className="h-4 w-4" aria-hidden /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingDelete(w)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
              Delete workout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.name}&rdquo; will be removed from this device. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-white hover:bg-destructive/90")}
              onClick={() => {
                if (pendingDelete) deleteWorkout(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
