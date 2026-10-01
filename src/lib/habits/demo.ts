import type { Checkin, Goal, Habit, HabitData, Mood } from "./types";
import { addDays, seeded, todayISO } from "@/lib/utils";
import { isScheduled } from "./logic";

export function emptyData(): HabitData {
  return { habits: [], checkins: [], goals: [], moods: [], isDemo: false };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function demoData(now: Date = new Date()): HabitData {
  const rnd = seeded(7);
  const created = todayISO(addDays(now, -200));
  const habits: Habit[] = [
    { id: "h-med", name: "Meditate", emoji: "🧘", color: "#8b5cf6", schedule: { kind: "daily" }, timeOfDay: "morning", target: 1, unit: "10 min", createdAt: created },
    { id: "h-water", name: "Drink water", emoji: "💧", color: "#0ea5e9", schedule: { kind: "daily" }, timeOfDay: "anytime", target: 8, unit: "glasses", createdAt: created },
    { id: "h-read", name: "Read 20 pages", emoji: "📚", color: "#f59e0b", schedule: { kind: "daily" }, timeOfDay: "morning", target: 1, createdAt: created },
    { id: "h-gym", name: "Workout", emoji: "🏋️", color: "#ef4444", schedule: { kind: "times", perWeek: 4 }, timeOfDay: "evening", target: 1, unit: "45 min", createdAt: created },
    { id: "h-journal", name: "Journal", emoji: "✍️", color: "#10b981", schedule: { kind: "weekdays", days: [1, 2, 3, 4, 5] }, timeOfDay: "evening", target: 1, createdAt: created },
    { id: "h-lang", name: "Language practice", emoji: "🗣️", color: "#ec4899", schedule: { kind: "daily" }, timeOfDay: "afternoon", target: 1, unit: "15 min", createdAt: created },
    { id: "h-screen", name: "No screens after 11pm", emoji: "🌙", color: "#6366f1", schedule: { kind: "daily" }, timeOfDay: "evening", target: 1, createdAt: created },
  ];
  const checkins: Checkin[] = [];
  const moods: Mood[] = [];
  const t = (h: number, spread = 1) => { const hh = Math.max(5, Math.min(23, Math.round(h + (rnd() - 0.5) * 2 * spread))); return `${pad(hh)}:${pad(Math.floor(rnd() * 60))}`; };
  const todayIso = todayISO(now);
  for (let i = 200; i >= 0; i--) {
    const d = addDays(now, -i);
    const iso = todayISO(d);
    const isToday = iso === todayIso;
    let lift = 0;
    for (const h of habits) {
      if (!isScheduled(h, d)) continue;
      let p = 0.75, hour = 8;
      switch (h.id) {
        case "h-med": p = i <= 23 ? 1 : i === 24 ? 0 : 0.85; hour = 7; break;
        case "h-water": p = 0.85; hour = 20; break;
        case "h-read": p = 0.72; hour = rnd() < 0.8 ? 21 : 8; break;
        case "h-gym": p = i <= 8 ? 0.12 : 0.62; hour = 19; break;
        case "h-journal": p = 0.7; hour = 22; break;
        case "h-lang": p = i <= 9 ? 1 : 0.78; hour = 14; break;
        case "h-screen": p = 0.55; hour = 23; break;
      }
      if (isToday) p = ["h-med", "h-lang"].includes(h.id) ? 1 : 0;
      if (h.id === "h-water") {
        const count = isToday ? 5 : rnd() < p ? 8 : Math.floor(rnd() * 7);
        if (count) checkins.push({ habitId: h.id, date: iso, count, time: t(hour, 3) });
        continue;
      }
      if (rnd() < p) {
        checkins.push({ habitId: h.id, date: iso, count: 1, time: t(hour, h.id === "h-read" ? 0.5 : 1) });
        if (h.id === "h-gym") lift += 1.1;
        if (h.id === "h-med") lift += 0.4;
      }
    }
    if (!isToday && rnd() < 0.88) {
      const score = Math.max(1, Math.min(5, Math.round(2.6 + lift + (rnd() - 0.5) * 1.6)));
      const tags = [["work", "family", "friends", "sleep", "exercise", "stress", "outdoors"][Math.floor(rnd() * 7)]];
      moods.push({ date: iso, score, tags, note: score >= 4 ? "Good energy today" : score <= 2 ? "Felt drained" : undefined });
    }
  }
  const goals: Goal[] = [
    { id: "g-10k", title: "Run a 10K", why: "Feel strong at 30", deadline: todayISO(addDays(now, 40)), color: "#ef4444", emoji: "🏃", habitIds: ["h-gym"],
      milestones: [{ id: "m1", title: "Run 3K non-stop", done: true }, { id: "m2", title: "Run 5K under 35 min", done: true }, { id: "m3", title: "Run 7K", done: false }, { id: "m4", title: "Race day: 10K", done: false }] },
    { id: "g-books", title: "Finish 3 books this season", why: "Read more than I scroll", deadline: todayISO(addDays(now, 15)), color: "#f59e0b", emoji: "📚", habitIds: ["h-read"],
      milestones: [{ id: "b1", title: "Atomic Habits", done: true }, { id: "b2", title: "Deep Work", done: true }, { id: "b3", title: "Sapiens", done: false }] },
    { id: "g-calm", title: "30-day meditation challenge", color: "#8b5cf6", emoji: "🧘", habitIds: ["h-med"],
      milestones: [{ id: "c1", title: "7 days", done: true }, { id: "c2", title: "14 days", done: true }, { id: "c3", title: "21 days", done: true }, { id: "c4", title: "30 days", done: false }] },
  ];
  return { habits, checkins, goals, moods, isDemo: true };
}
