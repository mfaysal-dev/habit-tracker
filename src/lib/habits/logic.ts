import type { Checkin, Goal, Habit, HabitData, Mood, TimeOfDay } from "./types";
import { addDays, diffDays, parseISO, todayISO } from "@/lib/utils";

export type CheckMap = Map<string, Map<string, Checkin>>;

export function buildMap(checkins: Checkin[]): CheckMap {
  const m: CheckMap = new Map();
  for (const c of checkins) {
    if (!m.has(c.habitId)) m.set(c.habitId, new Map());
    m.get(c.habitId)!.set(c.date, c);
  }
  return m;
}

export function isScheduled(h: Habit, d: Date) {
  if (todayISO(d) < h.createdAt) return false;
  if (h.schedule.kind === "weekdays") return h.schedule.days.includes(d.getDay());
  return true;
}

export function countOn(map: CheckMap, h: Habit, date: string) {
  return map.get(h.id)?.get(date)?.count ?? 0;
}

export function isDone(map: CheckMap, h: Habit, date: string) {
  return countOn(map, h, date) >= h.target;
}

function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

export function weekCount(map: CheckMap, h: Habit, anyDay: Date) {
  const s = weekStart(anyDay);
  let n = 0;
  for (let i = 0; i < 7; i++) if (isDone(map, h, todayISO(addDays(s, i)))) n++;
  return n;
}

/** Current streak. Today being incomplete doesn't break the streak (it's still in progress). */
export function streak(map: CheckMap, h: Habit, now: Date = new Date()): number {
  if (h.schedule.kind === "times") {
    const per = h.schedule.perWeek;
    let n = 0;
    let w = weekStart(now);
    if (weekCount(map, h, w) >= per) n++;
    w = addDays(w, -7);
    while (todayISO(addDays(w, 6)) >= h.createdAt && weekCount(map, h, w) >= per) { n++; w = addDays(w, -7); }
    return n;
  }
  let n = 0;
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (isScheduled(h, d) && !isDone(map, h, todayISO(d))) d = addDays(d, -1);
  for (let i = 0; i < 1000; i++) {
    const iso = todayISO(d);
    if (iso < h.createdAt) break;
    if (isScheduled(h, d)) {
      if (isDone(map, h, iso)) n++;
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(map: CheckMap, h: Habit, now: Date = new Date()): number {
  if (h.schedule.kind === "times") return streak(map, h, now);
  let best = 0, cur = 0;
  for (let d = parseISO(h.createdAt); todayISO(d) <= todayISO(now); d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    if (isDone(map, h, todayISO(d))) { cur++; best = Math.max(best, cur); } else if (todayISO(d) !== todayISO(now)) cur = 0;
  }
  return best;
}

export function streakUnit(h: Habit) {
  return h.schedule.kind === "times" ? "wk" : "d";
}

/** Completion rate over the `days` days ending yesterday (or today if done). */
export function completionRate(map: CheckMap, h: Habit, now: Date, days = 30, offset = 0) {
  let sched = 0, done = 0;
  const end = addDays(now, -offset);
  for (let i = 0; i < days; i++) {
    const d = addDays(end, -i);
    const iso = todayISO(d);
    if (iso < h.createdAt) break;
    const isToday = iso === todayISO(now);
    const ok = isDone(map, h, iso);
    if (isToday && !ok) continue;
    if (h.schedule.kind === "times") { sched += h.schedule.perWeek / 7; if (ok) done++; }
    else if (isScheduled(h, d)) { sched++; if (ok) done++; }
  }
  return sched === 0 ? null : Math.min(1, done / sched);
}

export function dayScore(data: HabitData, map: CheckMap, d: Date) {
  const iso = todayISO(d);
  const hs = data.habits.filter((h) => !h.archived && isScheduled(h, d) && h.schedule.kind !== "times");
  const timesDone = data.habits.filter((h) => !h.archived && h.schedule.kind === "times" && isDone(map, h, iso)).length;
  const total = hs.length;
  const done = hs.filter((h) => isDone(map, h, iso)).length;
  if (total === 0) return timesDone > 0 ? 1 : null;
  return Math.min(1, (done + timesDone * 0.5) / total);
}

export function heatmap(data: HabitData, map: CheckMap, now: Date, weeks = 26) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = addDays(weekStart(end), -(weeks - 1) * 7);
  const cols: { date: string; score: number | null; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, w * 7 + i);
      const future = d > end;
      col.push({ date: todayISO(d), score: future ? null : dayScore(data, map, d), future });
    }
    cols.push(col);
  }
  return cols;
}

export function bucketOf(time: string): Exclude<TimeOfDay, "anytime"> {
  const h = Number(time.slice(0, 2));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export function hourLabel(h: number) {
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${ampm}`;
}

/** Most common completion hour + bucket for a habit (needs >= 5 check-ins). */
export function bestTime(data: HabitData, h: Habit, now: Date = new Date(), lookback = 60) {
  const from = todayISO(addDays(now, -lookback));
  const cs = data.checkins.filter((c) => c.habitId === h.id && c.date >= from && c.count >= h.target && c.time);
  if (cs.length < 5) return null;
  const hours = new Array(24).fill(0);
  for (const c of cs) hours[Number(c.time.slice(0, 2))]++;
  const buckets = { morning: 0, afternoon: 0, evening: 0 };
  for (const c of cs) buckets[bucketOf(c.time)]++;
  const bucket = (Object.keys(buckets) as (keyof typeof buckets)[]).sort((a, b) => buckets[b] - buckets[a])[0];
  const hour = hours.indexOf(Math.max(...hours));
  return { hour, bucket, share: buckets[bucket] / cs.length, samples: cs.length };
}

export function hourHistogram(data: HabitData, now: Date, lookback = 30) {
  const from = todayISO(addDays(now, -lookback));
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: hourLabel(h), count: 0 }));
  for (const c of data.checkins) if (c.date >= from && c.time) hours[Number(c.time.slice(0, 2))].count++;
  return hours;
}

export function moodOn(moods: Mood[], date: string) {
  return moods.find((m) => m.date === date);
}

/** Average mood on days the habit was done vs not done (scheduled), last 60 days. */
export function moodLift(data: HabitData, map: CheckMap, h: Habit, now: Date) {
  const done: number[] = [], miss: number[] = [];
  for (let i = 1; i <= 60; i++) {
    const d = addDays(now, -i);
    const iso = todayISO(d);
    const m = moodOn(data.moods, iso);
    if (!m || !isScheduled(h, d)) continue;
    (isDone(map, h, iso) ? done : miss).push(m.score);
  }
  if (done.length < 5 || miss.length < 4) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { lift: avg(done) - avg(miss), done: avg(done), miss: avg(miss) };
}

export function goalProgress(g: Goal) {
  const total = g.milestones.length;
  const done = g.milestones.filter((m) => m.done).length;
  return { total, done, pct: total ? (done / total) * 100 : 0 };
}

export function weeklyCompletion(data: HabitData, map: CheckMap, now: Date, weeks = 8) {
  return Array.from({ length: weeks }, (_, i) => {
    const s = addDays(weekStart(now), -(weeks - 1 - i) * 7);
    const scores: number[] = [];
    for (let k = 0; k < 7; k++) {
      const d = addDays(s, k);
      if (d > now) break;
      const sc = dayScore(data, map, d);
      if (sc !== null) scores.push(sc);
    }
    return { week: s.toLocaleDateString("en-US", { month: "short", day: "numeric" }), pct: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0 };
  });
}

/* ---------------- Assistant rules ---------------- */

export type HabitAction =
  | { kind: "check"; habitId: string }
  | { kind: "setTime"; habitId: string; timeOfDay: TimeOfDay }
  | { kind: "ease"; habitId: string }
  | { kind: "logMood" }
  | { kind: "view"; view: string };

export type RawInsight = { id: string; tone: "alert" | "warn" | "tip" | "win"; title: string; body: string; metric?: string; actions: { label: string; action: HabitAction }[] };

const MILESTONES = [100, 66, 50, 30, 21, 14, 7];

export function easierSchedule(h: Habit): Partial<Habit> {
  if (h.target > 1) return { target: Math.max(1, Math.round(h.target * 0.6)) };
  if (h.schedule.kind === "daily") return { schedule: { kind: "times", perWeek: 5 } };
  if (h.schedule.kind === "times" && h.schedule.perWeek > 2) return { schedule: { kind: "times", perWeek: h.schedule.perWeek - 1 } };
  if (h.schedule.kind === "weekdays" && h.schedule.days.length > 2) return { schedule: { kind: "weekdays", days: h.schedule.days.slice(0, -1) } };
  return {};
}

export function generateInsights(data: HabitData, now: Date = new Date()): RawInsight[] {
  const map = buildMap(data.checkins);
  const today = todayISO(now);
  const hour = now.getHours();
  const out: RawInsight[] = [];
  const active = data.habits.filter((h) => !h.archived);

  for (const h of active) {
    const s = streak(map, h, now);
    const unit = streakUnit(h);
    const doneToday = isDone(map, h, today);
    // Streak at risk (evening, scheduled, not done)
    if (h.schedule.kind !== "times" && isScheduled(h, now) && !doneToday && s >= 3 && hour >= 17) {
      out.push({ id: `risk-${h.id}-${today}`, tone: "alert", title: `Keep your ${s}-day ${h.name} streak alive`, body: `It's still open for today. Even a tiny version counts — protect the chain.`, metric: `🔥 ${s}`, actions: [{ label: "Mark done", action: { kind: "check", habitId: h.id } }] });
    }
    // Celebrate milestones
    const ms = MILESTONES.find((m) => s >= m);
    if (ms && h.schedule.kind !== "times") {
      out.push({ id: `streak-${h.id}-${ms}`, tone: "win", title: `${h.emoji} ${s}-day ${h.name} streak!`, body: s === ms ? `You just hit the ${ms}-day milestone. That's identity-level consistency.` : `Past the ${ms}-day mark and counting. Next milestone: ${[7, 14, 21, 30, 50, 66, 100, 365].find((x) => x > s)} days.`, metric: `🔥 ${s}${unit}`, actions: [] });
    } else if (h.schedule.kind === "times" && s >= 3) {
      out.push({ id: `streak-${h.id}-w${s}`, tone: "win", title: `${h.emoji} ${s} weeks in a row hitting ${h.name}`, body: `You've met your ${h.schedule.perWeek}×/week target ${s} weeks straight.`, metric: `${s}wk`, actions: [] });
    }
    // Slipping
    const recent = completionRate(map, h, now, 7);
    const before = completionRate(map, h, now, 21, 7);
    if (recent !== null && before !== null && before >= 0.6 && before - recent >= 0.3) {
      const bt = bestTime(data, h, now);
      const ease = easierSchedule(h);
      const actions: RawInsight["actions"] = [];
      if (bt && bt.bucket !== h.timeOfDay) actions.push({ label: `Move to ${bt.bucket}`, action: { kind: "setTime", habitId: h.id, timeOfDay: bt.bucket } });
      if (Object.keys(ease).length) actions.push({ label: "Make it easier", action: { kind: "ease", habitId: h.id } });
      if (!doneToday && isScheduled(h, now)) actions.push({ label: "Log it now", action: { kind: "check", habitId: h.id } });
      out.push({
        id: `slip-${h.id}-${today}`, tone: "warn",
        title: `${h.name} is slipping`,
        body: `Down to ${Math.round(recent * 100)}% this week from ${Math.round(before * 100)}% before. ${bt ? `You're most reliable around ${hourLabel(bt.hour)} — anchoring it there could help.` : "Try shrinking it to a 2-minute version to rebuild momentum."}`,
        metric: `${Math.round(recent * 100)}%`, actions,
      });
    }
    // Best time suggestion
    const bt = bestTime(data, h, now);
    if (bt && h.timeOfDay !== "anytime" && bt.bucket !== h.timeOfDay && bt.share >= 0.6 && !out.some((o) => o.id.startsWith(`slip-${h.id}`))) {
      out.push({
        id: `time-${h.id}-${bt.bucket}`, tone: "tip",
        title: `You do ${h.name} in the ${bt.bucket}, not the ${h.timeOfDay}`,
        body: `${Math.round(bt.share * 100)}% of your last ${bt.samples} check-ins happened in the ${bt.bucket} (peak ~${hourLabel(bt.hour)}). Scheduling it where it actually happens makes it stickier.`,
        actions: [{ label: `Move to ${bt.bucket}`, action: { kind: "setTime", habitId: h.id, timeOfDay: bt.bucket } }],
      });
    }
    // Mood lift
    const ml = moodLift(data, map, h, now);
    if (ml && ml.lift >= 0.6) {
      out.push({ id: `lift-${h.id}`, tone: "tip", title: `${h.name} lifts your mood`, body: `Your mood averages ${ml.done.toFixed(1)}/5 on days you do it vs ${ml.miss.toFixed(1)} when you skip. Worth prioritizing on tough days.`, metric: `+${ml.lift.toFixed(1)}`, actions: !doneToday && isScheduled(h, now) ? [{ label: "Do it today", action: { kind: "check", habitId: h.id } }] : [] });
    }
  }

  // Perfect day yesterday
  const y = addDays(now, -1);
  const ys = dayScore(data, map, y);
  if (ys === 1) out.push({ id: `perfect-${todayISO(y)}`, tone: "win", title: "Perfect day yesterday ✨", body: "Every scheduled habit checked off. Stack another one today.", actions: [] });

  // Mood
  const recentMoods = [0, 1, 2].map((i) => moodOn(data.moods, todayISO(addDays(now, -i)))).filter(Boolean) as Mood[];
  if (recentMoods.length === 3 && recentMoods.every((m) => m.score <= 2)) {
    out.push({ id: `lowmood-${today}`, tone: "warn", title: "Your mood has been low for 3 days", body: "Be gentle with yourself. Pick one small habit that usually helps, and consider talking to someone you trust.", actions: [{ label: "Log today's mood", action: { kind: "logMood" } }] });
  }
  if (!moodOn(data.moods, today) && hour >= 12) {
    out.push({ id: `mood-${today}`, tone: "tip", title: "How are you feeling today?", body: "A 2-second mood check-in helps the assistant spot which habits actually make you feel better.", actions: [{ label: "Log mood", action: { kind: "logMood" } }] });
  }

  // Goals
  for (const g of data.goals) {
    const p = goalProgress(g);
    if (p.total && p.done === p.total) { out.push({ id: `goal-done-${g.id}`, tone: "win", title: `Goal complete: ${g.title} 🎉`, body: "Every milestone ticked. Celebrate, then set your next arc.", actions: [] }); continue; }
    if (g.deadline) {
      const left = diffDays(parseISO(g.deadline), now);
      if (left < 0) out.push({ id: `goal-late-${g.id}`, tone: "alert", title: `${g.title} passed its deadline`, body: `${p.done}/${p.total} milestones done. Extend the date or trim the scope so it stays motivating.`, actions: [{ label: "Open goals", action: { kind: "view", view: "goals" } }] });
      else if (left <= 21 && p.pct < 70) out.push({ id: `goal-risk-${g.id}`, tone: "warn", title: `${g.title}: ${left} days left, ${Math.round(p.pct)}% done`, body: `${p.total - p.done} milestones remain. Focus on the next one: "${g.milestones.find((m) => !m.done)?.title}".`, actions: [{ label: "Open goals", action: { kind: "view", view: "goals" } }] });
    }
  }

  // Overload
  const dailyCount = active.filter((h) => h.schedule.kind === "daily").length;
  const overall = active.map((h) => completionRate(map, h, now, 14)).filter((x): x is number => x !== null);
  const avg = overall.length ? overall.reduce((a, b) => a + b, 0) / overall.length : 1;
  if (dailyCount >= 7 && avg < 0.5) out.push({ id: `overload-${today}`, tone: "tip", title: "You might be juggling too many habits", body: `${dailyCount} daily habits at ${Math.round(avg * 100)}% completion. Archiving 1–2 often lifts the rest.`, actions: [{ label: "Review habits", action: { kind: "view", view: "habits" } }] });

  return out;
}
