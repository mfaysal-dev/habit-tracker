"use client";
import { create } from "zustand";
import type { Goal, Habit } from "@/lib/habits/types";

type S = {
  view: string; setView: (v: string) => void;
  habitDialog: Habit | null | undefined; openHabit: (h?: Habit | null) => void; closeHabit: () => void;
  goalDialog: Goal | null | undefined; openGoal: (g?: Goal | null) => void; closeGoal: () => void;
  moodOpen: boolean; setMoodOpen: (o: boolean) => void;
};
export const useHabitUI = create<S>((set) => ({
  view: "dashboard",
  setView: (view) => { set({ view }); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); },
  habitDialog: undefined, openHabit: (h) => set({ habitDialog: h ?? null }), closeHabit: () => set({ habitDialog: undefined }),
  goalDialog: undefined, openGoal: (g) => set({ goalDialog: g ?? null }), closeGoal: () => set({ goalDialog: undefined }),
  moodOpen: false, setMoodOpen: (moodOpen) => set({ moodOpen }),
}));

export const MOODS = [
  { score: 1, emoji: "😞", label: "Rough", color: "#ef4444" },
  { score: 2, emoji: "😕", label: "Meh", color: "#f97316" },
  { score: 3, emoji: "😐", label: "Okay", color: "#eab308" },
  { score: 4, emoji: "🙂", label: "Good", color: "#22c55e" },
  { score: 5, emoji: "😄", label: "Great", color: "#10b981" },
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function scheduleText(s: Habit["schedule"]) {
  if (s.kind === "daily") return "Every day";
  if (s.kind === "times") return `${s.perWeek}× per week`;
  if (s.days.length === 5 && [1, 2, 3, 4, 5].every((d) => s.days.includes(d))) return "Weekdays";
  if (s.days.length === 2 && s.days.includes(0) && s.days.includes(6)) return "Weekends";
  return [...s.days].sort().map((d) => DAY_NAMES[d]).join(", ");
}
