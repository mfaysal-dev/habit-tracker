import { describe, expect, it } from "vitest";
import { bestStreak, bestTime, buildMap, completionRate, easierSchedule, generateInsights, isScheduled, streak, heatmap } from "@/lib/habits/logic";
import { demoData } from "@/lib/habits/demo";
import type { Checkin, Habit, HabitData } from "@/lib/habits/types";
import { addDays, todayISO } from "@/lib/utils";

const NOW = new Date(2026, 9, 15, 20, 0); // Thu 15 Oct 2026, 8pm
const daily: Habit = { id: "a", name: "Read", emoji: "📚", color: "#000", schedule: { kind: "daily" }, timeOfDay: "morning", target: 1, createdAt: "2026-08-01" };
const ci = (habitId: string, daysAgo: number, time = "21:00", count = 1): Checkin => ({ habitId, date: todayISO(addDays(NOW, -daysAgo)), count, time });
const data = (habits: Habit[], checkins: Checkin[]): HabitData => ({ habits, checkins, goals: [], moods: [], isDemo: false });

describe("schedules", () => {
  it("respects weekday schedules", () => {
    const h: Habit = { ...daily, schedule: { kind: "weekdays", days: [1, 3, 5] } };
    expect(isScheduled(h, new Date(2026, 9, 12))).toBe(true); // Monday
    expect(isScheduled(h, new Date(2026, 9, 13))).toBe(false); // Tuesday
  });
});

describe("streaks", () => {
  it("counts consecutive days and doesn't break on an unfinished today", () => {
    const m = buildMap([1, 2, 3, 4, 6].map((d) => ci("a", d)));
    expect(streak(m, daily, NOW)).toBe(4);
    const m2 = buildMap([0, 1, 2].map((d) => ci("a", d)));
    expect(streak(m2, daily, NOW)).toBe(3);
  });
  it("skips unscheduled days for weekday habits", () => {
    const h: Habit = { ...daily, schedule: { kind: "weekdays", days: [1, 2, 3, 4, 5] } };
    // Thu 15 (today, pending), Wed 14, Tue 13, Mon 12, (weekend), Fri 9
    const m = buildMap([1, 2, 3, 6].map((d) => ci("a", d)));
    expect(streak(m, h, NOW)).toBe(4);
  });
  it("counts weekly quotas for X-per-week habits", () => {
    const h: Habit = { ...daily, schedule: { kind: "times", perWeek: 2 } };
    // this week (Mon 12..): days 1,2 ; last week: days 5,7
    const m = buildMap([1, 2, 5, 7].map((d) => ci("a", d)));
    expect(streak(m, h, NOW)).toBe(2);
  });
  it("tracks best streak", () => {
    const m = buildMap([1, 2, 5, 6, 7, 8, 9].map((d) => ci("a", d)));
    expect(bestStreak(m, daily, NOW)).toBe(5);
  });
});

describe("analytics", () => {
  it("computes completion rate", () => {
    const m = buildMap([1, 2, 3, 4, 5].map((d) => ci("a", d)));
    // window of 10 days includes today (pending, so excluded) → 5 of 9
    expect(completionRate(m, daily, NOW, 10)).toBeCloseTo(5 / 9);
  });
  it("finds the time you actually do a habit and suggests moving it", () => {
    const d = data([daily], [1, 2, 3, 4, 5, 6, 8].map((x) => ci("a", x, "21:15")));
    expect(bestTime(d, daily, NOW)?.bucket).toBe("evening");
    const ins = generateInsights(d, NOW);
    const t = ins.find((i) => i.id.startsWith("time-a"));
    expect(t?.actions[0].action).toEqual({ kind: "setTime", habitId: "a", timeOfDay: "evening" });
  });
  it("detects a slipping habit", () => {
    const old = Array.from({ length: 21 }, (_, i) => ci("a", i + 8, "08:00"));
    const d = data([daily], old);
    expect(generateInsights(d, NOW).some((i) => i.id.startsWith("slip-a"))).toBe(true);
  });
  it("warns when an evening streak is at risk", () => {
    const d = data([daily], [1, 2, 3, 4, 5].map((x) => ci("a", x, "08:00")));
    const r = generateInsights(d, NOW).find((i) => i.id.startsWith("risk-a"));
    expect(r?.tone).toBe("alert");
  });
  it("eases habits sensibly", () => {
    expect(easierSchedule(daily)).toEqual({ schedule: { kind: "times", perWeek: 5 } });
    expect(easierSchedule({ ...daily, target: 10 })).toEqual({ target: 6 });
  });
  it("builds a heatmap and rich demo insights", () => {
    const d = demoData(NOW);
    const cols = heatmap(d, buildMap(d.checkins), NOW, 26);
    expect(cols).toHaveLength(26);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    const ins = generateInsights(d, NOW);
    expect(ins.some((i) => i.tone === "win")).toBe(true);
    expect(ins.some((i) => i.id.startsWith("slip-h-gym"))).toBe(true);
  });
});
