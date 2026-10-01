"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goal, Habit, HabitData } from "./types";
import { demoData, emptyData } from "./demo";
import { easierSchedule } from "./logic";
import { todayISO, uid } from "@/lib/utils";

const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

type Actions = {
  setCount: (habitId: string, date: string, count: number) => void;
  toggle: (habitId: string, date?: string) => void;
  increment: (habitId: string, date?: string, delta?: number) => void;
  upsertHabit: (h: Omit<Habit, "id" | "createdAt"> & { id?: string }) => void;
  updateHabit: (id: string, p: Partial<Habit>) => void;
  easeHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  upsertGoal: (g: Omit<Goal, "id"> & { id?: string }) => void;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, msId: string) => void;
  logMood: (date: string, score: number, note?: string, tags?: string[]) => void;
  clearDemo: () => void;
  loadDemo: () => void;
  importData: (d: unknown) => void;
};

export const useHabits = create<HabitData & Actions>()(
  persist(
    (set, get) => ({
      ...demoData(),
      setCount: (habitId, date, count) => set((s) => {
        const rest = s.checkins.filter((c) => !(c.habitId === habitId && c.date === date));
        return { checkins: count > 0 ? [...rest, { habitId, date, count, time: nowTime() }] : rest };
      }),
      toggle: (habitId, date = todayISO()) => {
        const h = get().habits.find((x) => x.id === habitId);
        if (!h) return;
        const cur = get().checkins.find((c) => c.habitId === habitId && c.date === date)?.count ?? 0;
        get().setCount(habitId, date, cur >= h.target ? 0 : h.target);
      },
      increment: (habitId, date = todayISO(), delta = 1) => {
        const h = get().habits.find((x) => x.id === habitId);
        if (!h) return;
        const cur = get().checkins.find((c) => c.habitId === habitId && c.date === date)?.count ?? 0;
        get().setCount(habitId, date, Math.max(0, Math.min(h.target * 3, cur + delta)));
      },
      upsertHabit: (h) => set((s) => (h.id && s.habits.some((x) => x.id === h.id)
        ? { habits: s.habits.map((x) => (x.id === h.id ? { ...x, ...h, id: x.id } : x)) }
        : { habits: [...s.habits, { ...h, id: uid(), createdAt: todayISO() }] })),
      updateHabit: (id, p) => set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...p } : h)) })),
      easeHabit: (id) => { const h = get().habits.find((x) => x.id === id); if (h) get().updateHabit(id, easierSchedule(h)); },
      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id), checkins: s.checkins.filter((c) => c.habitId !== id) })),
      upsertGoal: (g) => set((s) => (g.id && s.goals.some((x) => x.id === g.id)
        ? { goals: s.goals.map((x) => (x.id === g.id ? { ...x, ...g, id: x.id } : x)) }
        : { goals: [...s.goals, { ...g, id: uid() }] })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      toggleMilestone: (goalId, msId) => set((s) => ({
        goals: s.goals.map((g) => g.id !== goalId ? g : { ...g, milestones: g.milestones.map((m) => (m.id === msId ? { ...m, done: !m.done, doneAt: !m.done ? todayISO() : undefined } : m)) }),
      })),
      logMood: (date, score, note, tags = []) => set((s) => ({ moods: [...s.moods.filter((m) => m.date !== date), { date, score, note, tags }] })),
      clearDemo: () => set({ ...emptyData() }),
      loadDemo: () => set({ ...demoData() }),
      importData: (d) => {
        const x = d as Partial<HabitData>;
        if (!x || !Array.isArray(x.habits) || !Array.isArray(x.checkins)) throw new Error("Backup is missing habits/check-ins");
        set({ ...emptyData(), ...x, isDemo: Boolean(x.isDemo) });
      },
    }),
    { name: "ritual-data", version: 1 },
  ),
);

export function exportHabits(): HabitData {
  const s = useHabits.getState();
  return { habits: s.habits, checkins: s.checkins, goals: s.goals, moods: s.moods, isDemo: s.isDemo };
}
