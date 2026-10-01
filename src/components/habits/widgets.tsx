"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { CalendarDays, Clock, Flame, Goal as GoalIcon, ListChecks, Plus, Smile, Sparkles, Trophy, Activity } from "lucide-react";
import type { WidgetDef } from "@/components/kit/dashboard";
import { AssistantBrief, type Insight } from "@/components/kit/assistant";
import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/progress";
import { useHabits } from "@/lib/habits/store";
import type { Habit, TimeOfDay } from "@/lib/habits/types";
import { bestStreak, buildMap, completionRate, dayScore, goalProgress, hourHistogram, isDone, isScheduled, streak, streakUnit, weeklyCompletion } from "@/lib/habits/logic";
import { addDays, cn, formatDate, todayISO } from "@/lib/utils";
import { HabitCheck } from "./habit-check";
import { Heatmap } from "./heatmap";
import { MoodPicker } from "./dialogs";
import { MOODS, scheduleText, useHabitUI } from "./ui-state";
import { toast } from "@/lib/toast-store";

const tooltipStyle = { background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12, color: "var(--color-foreground)" };
const TOD_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];
const TOD_LABEL: Record<TimeOfDay, string> = { morning: "☀️ Morning", afternoon: "🌤️ Afternoon", evening: "🌙 Evening", anytime: "✨ Anytime" };

export function useMap() {
  const checkins = useHabits((s) => s.checkins);
  return useMemo(() => buildMap(checkins), [checkins]);
}

export function HabitRow({ h, compact }: { h: Habit; compact?: boolean }) {
  const map = useMap();
  const openHabit = useHabitUI((s) => s.openHabit);
  const s = streak(map, h, new Date());
  const done = isDone(map, h, todayISO());
  return (
    <div className={cn("group flex items-center gap-3 rounded-2xl border p-2.5 pr-3 transition", done ? "bg-muted/40" : "bg-card hover:border-primary/30")}>
      <HabitCheck habit={h} size={compact ? 38 : 44} />
      <button onClick={() => openHabit(h)} className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through decoration-2")} style={done ? { textDecorationColor: h.color } : undefined}>{h.emoji} {h.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{scheduleText(h.schedule)}{h.unit && ` · ${h.target > 1 ? `${h.target} ` : ""}${h.unit}`}</p>
      </button>
      {s > 0 && <span className={cn("flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", s >= 7 ? "bg-warning/20 text-[color-mix(in_oklch,var(--color-warning)_60%,black)] dark:text-warning" : "bg-muted text-muted-foreground")}><Flame className="size-3" />{s}{streakUnit(h)}</span>}
    </div>
  );
}

function TodayWidget({ size }: { size: string }) {
  const habits = useHabits((s) => s.habits);
  const map = useMap();
  const openHabit = useHabitUI((s) => s.openHabit);
  const now = new Date();
  const today = habits.filter((h) => !h.archived && isScheduled(h, now) && (h.schedule.kind !== "times" || true));
  const doneN = today.filter((h) => isDone(map, h, todayISO(now))).length;
  const pct = today.length ? (doneN / today.length) * 100 : 0;
  const grouped = TOD_ORDER.map((t) => ({ t, items: today.filter((h) => h.timeOfDay === t) })).filter((g) => g.items.length);
  if (!habits.length) return <div className="py-10 text-center"><p className="font-medium">No habits yet</p><p className="mb-3 text-sm text-muted-foreground">Start with one tiny habit.</p><Button onClick={() => openHabit()}><Plus /> New habit</Button></div>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary-soft to-transparent p-3">
        <Ring value={pct} size={58} stroke={6}><span className="tabular text-sm font-bold">{Math.round(pct)}%</span></Ring>
        <div className="flex-1">
          <p className="font-display text-lg font-semibold leading-tight">{doneN === today.length && today.length ? "All done — legendary! 🎉" : `${doneN} of ${today.length} done today`}</p>
          <p className="text-xs text-muted-foreground">{formatDate(now, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => openHabit()}><Plus /> Habit</Button>
      </div>
      <div className={cn("grid gap-x-4 gap-y-3", size === "l" || size === "xl" ? "md:grid-cols-2" : "")}>
        {grouped.map((g) => (
          <div key={g.t} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{TOD_LABEL[g.t]}</p>
            {g.items.map((h) => <HabitRow key={h.id} h={h} compact />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsWidget() {
  const data = useHabits();
  const map = useMap();
  const now = new Date();
  const active = data.habits.filter((h) => !h.archived);
  const rates = active.map((h) => completionRate(map, h, now, 30)).filter((x): x is number => x !== null);
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  let perfect = 0;
  for (let i = 1; i <= 30; i++) if (dayScore(data, map, addDays(now, -i)) === 1) perfect++;
  const best = Math.max(0, ...active.map((h) => bestStreak(map, h, now)));
  const totalChecks = data.checkins.filter((c) => c.date >= todayISO(addDays(now, -30))).length;
  const items = [
    { label: "30-day consistency", value: `${Math.round(avg * 100)}%`, icon: Activity },
    { label: "Perfect days (30d)", value: perfect, icon: Trophy },
    { label: "Best streak ever", value: `${best}d`, icon: Flame },
    { label: "Check-ins (30d)", value: totalChecks, icon: ListChecks },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((x) => (
        <div key={x.label} className="rounded-2xl bg-muted/60 p-3.5">
          <x.icon className="size-4 text-primary" />
          <p className="tabular mt-2 font-display text-2xl font-bold">{x.value}</p>
          <p className="text-[11px] text-muted-foreground">{x.label}</p>
        </div>
      ))}
    </div>
  );
}

function StreaksWidget() {
  const habits = useHabits((s) => s.habits);
  const map = useMap();
  const now = new Date();
  const rows = habits.filter((h) => !h.archived).map((h) => ({ h, s: streak(map, h, now), best: bestStreak(map, h, now) })).sort((a, b) => b.s - a.s).slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.best));
  return (
    <ul className="space-y-2.5">
      {rows.map(({ h, s, best }, i) => (
        <li key={h.id} className="flex items-center gap-3">
          <span className="w-4 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
          <span className="text-lg">{h.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm"><span className="truncate">{h.name}</span><span className="tabular font-semibold">{s}{streakUnit(h)}</span></div>
            <div className="relative mt-1 h-1.5 rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(best / max) * 100}%`, background: h.color }} />
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(Math.min(s, best) / max) * 100}%`, background: h.color }} />
            </div>
          </div>
        </li>
      ))}
      {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No habits yet.</p>}
      {rows.length > 0 && <li className="text-[11px] text-muted-foreground">Faded bar = personal best.</li>}
    </ul>
  );
}

function MoodWidget() {
  const { moods, logMood } = useHabits();
  const today = todayISO();
  const cur = moods.find((m) => m.date === today);
  const series = Array.from({ length: 21 }, (_, i) => {
    const d = todayISO(addDays(new Date(), -(20 - i)));
    return { date: d, score: moods.find((m) => m.date === d)?.score ?? null };
  });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{cur ? `Today: ${MOODS[cur.score - 1].emoji} ${MOODS[cur.score - 1].label} — tap to change` : "How's today going?"}</p>
      <MoodPicker compact value={cur?.score} onChange={(s) => { logMood(today, s, cur?.note, cur?.tags); toast(`Mood logged ${MOODS[s - 1].emoji}`); }} />
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ left: -30, right: 6, top: 6 }}>
            <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" />
            <XAxis dataKey="date" hide />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => formatDate(String(l))} formatter={(v) => [`${MOODS[Number(v) - 1]?.emoji} ${MOODS[Number(v) - 1]?.label}`, "Mood"]} />
            <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 2.5, fill: "var(--color-primary)" }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GoalsWidget() {
  const goals = useHabits((s) => s.goals);
  const toggleMilestone = useHabits((s) => s.toggleMilestone);
  if (!goals.length) return <p className="py-8 text-center text-sm text-muted-foreground">No goals yet.</p>;
  return (
    <ul className="space-y-3.5">
      {goals.slice(0, 4).map((g) => {
        const p = goalProgress(g);
        const next = g.milestones.find((m) => !m.done);
        return (
          <li key={g.id}>
            <div className="flex items-center gap-2 text-sm"><span>{g.emoji}</span><span className="flex-1 truncate font-medium">{g.title}</span><span className="tabular text-xs text-muted-foreground">{p.done}/{p.total}</span></div>
            <div className="mt-1.5 flex gap-1">{g.milestones.map((m) => <span key={m.id} className="h-1.5 flex-1 rounded-full" style={{ background: m.done ? g.color : "var(--color-muted)" }} />)}</div>
            {next && <button onClick={() => { toggleMilestone(g.id, next.id); toast(`Milestone done: ${next.title} 🎯`); }} className="mt-1.5 text-[11px] text-muted-foreground hover:text-primary">Next: {next.title} — <span className="underline">mark done</span></button>}
          </li>
        );
      })}
    </ul>
  );
}

function WeeklyWidget() {
  const data = useHabits();
  const map = useMap();
  const rows = weeklyCompletion(data, map, new Date(), 10);
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: -24, right: 4, top: 8 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" unit="%" domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} formatter={(v) => [`${v}%`, "Completion"]} labelFormatter={(l) => `Week of ${l}`} />
          <Bar dataKey="pct" radius={[8, 8, 3, 3]} maxBarSize={30}>
            {rows.map((r, i) => <Cell key={i} fill={i === rows.length - 1 ? "var(--color-primary)" : "color-mix(in oklch, var(--color-primary) 45%, var(--color-muted))"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeOfDayWidget() {
  const data = useHabits();
  const rows = hourHistogram(data, new Date(), 30).filter((r) => r.hour >= 5);
  const peak = rows.reduce((a, b) => (b.count > a.count ? b : a), rows[0]);
  return (
    <div>
      <p className="text-xs text-muted-foreground">You&apos;re most active around <b className="text-foreground">{peak?.label}</b> (last 30 days).</p>
      <div className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: -28, right: 4, top: 8 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" interval={2} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} formatter={(v) => [v, "Check-ins"]} />
            <Bar dataKey="count" radius={[6, 6, 2, 2]}>
              {rows.map((r) => <Cell key={r.hour} fill={r.hour < 12 ? "var(--color-chart-2)" : r.hour < 17 ? "var(--color-chart-3)" : "var(--color-chart-1)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function useWidgetRegistry(insights: Insight[]): WidgetDef[] {
  const setView = useHabitUI((s) => s.setView);
  const setMoodOpen = useHabitUI((s) => s.setMoodOpen);
  return [
    { type: "today", title: "Today", description: "Check off today's habits, grouped by time of day.", icon: ListChecks, defaultSize: "l", render: (s) => <TodayWidget size={s} /> },
    { type: "assistant", title: "Coach brief", description: "Top insights with one-click actions.", icon: Sparkles, defaultSize: "s", render: (s) => <AssistantBrief insights={insights} limit={s === "s" ? 3 : 4} /> },
    { type: "heatmap", title: "Consistency heatmap", description: "Six months of daily completion.", icon: CalendarDays, defaultSize: "l", render: (s) => <Heatmap weeks={s === "xl" ? 52 : s === "l" ? 30 : 17} /> },
    { type: "stats", title: "Your numbers", description: "Consistency, perfect days, best streak.", icon: Trophy, defaultSize: "s", render: () => <StatsWidget /> },
    { type: "streaks", title: "Streak leaderboard", description: "Current streaks vs personal bests.", icon: Flame, defaultSize: "s", render: () => <StreaksWidget /> },
    { type: "mood", title: "Mood", description: "Quick mood log and 3-week trend.", icon: Smile, defaultSize: "s", render: () => <MoodWidget />, action: <Button size="sm" variant="ghost" onClick={() => setMoodOpen(true)}>Note</Button> },
    { type: "goals", title: "Goals", description: "Milestone progress at a glance.", icon: GoalIcon, defaultSize: "s", render: () => <GoalsWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("goals")}>All</Button> },
    { type: "weekly", title: "Weekly completion", description: "How consistent each week has been.", icon: Activity, defaultSize: "m", render: () => <WeeklyWidget /> },
    { type: "timeofday", title: "When you show up", description: "Check-ins by hour of day.", icon: Clock, defaultSize: "m", render: () => <TimeOfDayWidget /> },
  ];
}
