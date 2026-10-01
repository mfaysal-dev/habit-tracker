"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, ArchiveRestore, Check, Flame, Pencil, Plus, Target, Trash2, Sprout } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty";
import { Segmented } from "@/components/ui/segmented";
import { useHabits } from "@/lib/habits/store";
import { bestStreak, bestTime, completionRate, goalProgress, hourLabel, moodLift, streak, streakUnit } from "@/lib/habits/logic";
import { addDays, cn, daysInMonth, diffDays, formatDate, parseISO, todayISO, uid } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { HabitCheck } from "./habit-check";
import { MiniHeat } from "./heatmap";
import { MOODS, scheduleText, useHabitUI } from "./ui-state";
import { useMap } from "./widgets";

const tooltipStyle = { background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12, color: "var(--color-foreground)" };

export function HabitsView() {
  const data = useHabits();
  const { updateHabit, deleteHabit } = data;
  const map = useMap();
  const openHabit = useHabitUI((s) => s.openHabit);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const now = new Date();
  const list = data.habits.filter((h) => (tab === "active" ? !h.archived : h.archived));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented id="htab" value={tab} onChange={setTab} options={[{ value: "active", label: `Active (${data.habits.filter((h) => !h.archived).length})` }, { value: "archived", label: "Archived" }]} />
        <Button onClick={() => openHabit()}><Plus /> New habit</Button>
      </div>
      {list.length === 0 ? <EmptyState icon={Sprout} title={tab === "active" ? "No habits yet" : "Nothing archived"} hint={tab === "active" ? "Start with one tiny habit you can do in under two minutes." : undefined} action={tab === "active" ? <Button onClick={() => openHabit()}><Plus /> Create habit</Button> : undefined} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((h, i) => {
            const s = streak(map, h, now), best = bestStreak(map, h, now), rate = completionRate(map, h, now, 30), bt = bestTime(data, h, now), ml = moodLift(data, map, h, now);
            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}>
                <Card className="group overflow-hidden">
                  <div className="h-1" style={{ background: h.color }} />
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `color-mix(in oklch, ${h.color} 16%, transparent)` }}>{h.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold leading-tight">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{scheduleText(h.schedule)} · {h.timeOfDay}{h.unit && ` · ${h.target > 1 ? h.target + " " : ""}${h.unit}`}</p>
                      </div>
                      {!h.archived && <HabitCheck habit={h} size={40} />}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-muted/60 p-2"><p className="flex items-center justify-center gap-1 font-display text-lg font-bold"><Flame className="size-4 text-warning" />{s}<span className="text-xs font-normal text-muted-foreground">{streakUnit(h)}</span></p><p className="text-[10px] text-muted-foreground">Current</p></div>
                      <div className="rounded-xl bg-muted/60 p-2"><p className="font-display text-lg font-bold">{best}<span className="text-xs font-normal text-muted-foreground">{streakUnit(h)}</span></p><p className="text-[10px] text-muted-foreground">Best</p></div>
                      <div className="rounded-xl bg-muted/60 p-2"><p className="font-display text-lg font-bold">{rate === null ? "—" : `${Math.round(rate * 100)}%`}</p><p className="text-[10px] text-muted-foreground">30 days</p></div>
                    </div>
                    <div className="mt-4 overflow-x-auto"><MiniHeat habitId={h.id} weeks={18} /></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {bt && <Badge tone="info">Usually ~{hourLabel(bt.hour)}</Badge>}
                      {ml && ml.lift > 0.3 && <Badge tone="success">Mood +{ml.lift.toFixed(1)} on done days</Badge>}
                    </div>
                    <div className="mt-3 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => openHabit(h)}><Pencil /> Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => { updateHabit(h.id, { archived: !h.archived }); toast(h.archived ? "Habit restored" : "Habit archived", h.archived ? undefined : "History is kept."); }}>{h.archived ? <><ArchiveRestore /> Restore</> : <><Archive /> Archive</>}</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => { if (confirm(`Delete "${h.name}" and all its history?`)) { deleteHabit(h.id); toast("Habit deleted"); } }}><Trash2 /></Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GoalsView() {
  const { goals, habits, toggleMilestone, upsertGoal, deleteGoal } = useHabits();
  const map = useMap();
  const openGoal = useHabitUI((s) => s.openGoal);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return (
    <div className="space-y-5">
      <div className="flex justify-end"><Button onClick={() => openGoal()}><Plus /> New goal</Button></div>
      {goals.length === 0 ? <EmptyState icon={Target} title="No goals yet" hint="Goals give your habits a direction. Break one into milestones." action={<Button onClick={() => openGoal()}><Plus /> Create goal</Button>} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => {
            const p = goalProgress(g);
            const left = g.deadline ? diffDays(parseISO(g.deadline), new Date()) : null;
            return (
              <Card key={g.id} className="relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-15 blur-2xl" style={{ background: g.color }} />
                <div className="relative flex items-start gap-4">
                  <Ring value={p.pct} size={76} stroke={7} color={g.color}><span className="text-2xl">{g.emoji}</span></Ring>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-semibold leading-tight">{g.title}</p>
                    {g.why && <p className="mt-0.5 text-sm italic text-muted-foreground">“{g.why}”</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="primary">{p.done}/{p.total} milestones</Badge>
                      {left !== null && <Badge tone={left < 0 ? "danger" : left <= 21 ? "warning" : "default"}>{left < 0 ? `${-left}d overdue` : `${left}d left · ${formatDate(g.deadline!, { month: "short", day: "numeric" })}`}</Badge>}
                    </div>
                  </div>
                  <div className="flex">
                    <Button size="icon-sm" variant="ghost" aria-label="Edit goal" onClick={() => openGoal(g)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete goal" onClick={() => { if (confirm(`Delete goal "${g.title}"?`)) deleteGoal(g.id); }}><Trash2 /></Button>
                  </div>
                </div>
                <ol className="relative mt-5 space-y-1.5">
                  {g.milestones.map((m) => (
                    <li key={m.id}>
                      <button onClick={() => { toggleMilestone(g.id, m.id); if (!m.done) toast(`Milestone reached: ${m.title} 🎯`); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted/60" aria-pressed={m.done}>
                        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", m.done && "border-transparent text-white")} style={m.done ? { background: g.color } : { borderColor: g.color }}>{m.done && <Check className="size-3" strokeWidth={3} />}</span>
                        <span className={cn("flex-1", m.done && "text-muted-foreground line-through")}>{m.title}</span>
                        {m.doneAt && <span className="text-[10px] text-muted-foreground">{formatDate(m.doneAt)}</span>}
                      </button>
                    </li>
                  ))}
                </ol>
                <form className="relative mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = drafts[g.id]?.trim(); if (!t) return; upsertGoal({ ...g, milestones: [...g.milestones, { id: uid(), title: t, done: false }] }); setDrafts({ ...drafts, [g.id]: "" }); }}>
                  <Input value={drafts[g.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [g.id]: e.target.value })} placeholder="Add milestone…" className="h-9" aria-label={`Add milestone to ${g.title}`} />
                  <Button type="submit" size="sm" variant="soft" className="h-9"><Plus /></Button>
                </form>
                {g.habitIds.length > 0 && (
                  <div className="relative mt-4 flex flex-wrap gap-1.5 border-t pt-4">
                    <span className="mr-1 text-xs text-muted-foreground">Powered by</span>
                    {g.habitIds.map((id) => habits.find((h) => h.id === id)).filter(Boolean).map((h) => (
                      <span key={h!.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">{h!.emoji} {h!.name} · <Flame className="size-3 text-warning" />{streak(map, h!, new Date())}</span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MoodView() {
  const data = useHabits();
  const map = useMap();
  const setMoodOpen = useHabitUI((s) => s.setMoodOpen);
  const [offset, setOffset] = useState(() => (new Date().getDate() <= 7 ? -1 : 0));
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const dim = daysInMonth(month);
  const lead = (month.getDay() + 6) % 7;
  const series = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const d = todayISO(addDays(now, -(59 - i)));
    return { date: d, score: data.moods.find((m) => m.date === d)?.score ?? null };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data.moods]);
  const lifts = data.habits.filter((h) => !h.archived).map((h) => ({ h, l: moodLift(data, map, h, now) })).filter((x) => x.l).sort((a, b) => b.l!.lift - a.l!.lift);
  const logged = data.moods.filter((m) => m.date >= todayISO(addDays(now, -30)));
  const avg = logged.length ? logged.reduce((a, b) => a + b.score, 0) / logged.length : 0;
  const today = data.moods.find((m) => m.date === todayISO(now));
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="p-6 xl:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setOffset(offset - 1)} aria-label="Previous month">‹</Button><Button size="sm" variant="ghost" onClick={() => setOffset(0)}>Today</Button><Button size="sm" variant="ghost" onClick={() => setOffset(Math.min(0, offset + 1))} aria-label="Next month">›</Button></div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}</div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
          {Array.from({ length: dim }, (_, i) => {
            const d = todayISO(new Date(month.getFullYear(), month.getMonth(), i + 1));
            const m = data.moods.find((x) => x.date === d);
            const mo = m ? MOODS[m.score - 1] : null;
            const isToday = d === todayISO(now);
            return (
              <div key={d} title={m?.note ?? ""} className={cn("flex aspect-square flex-col items-center justify-center rounded-xl text-xs", isToday && "ring-2 ring-primary", d > todayISO(now) && "opacity-40")}
                style={{ background: mo ? `color-mix(in oklch, ${mo.color} 22%, transparent)` : "var(--color-muted)" }}>
                <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                <span className="text-base leading-none sm:text-xl">{mo?.emoji ?? ""}</span>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="space-y-5">
        <Card className="p-6">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="mt-1 font-display text-2xl font-semibold">{today ? `${MOODS[today.score - 1].emoji} ${MOODS[today.score - 1].label}` : "Not logged yet"}</p>
          <Button className="mt-3 w-full" onClick={() => setMoodOpen(true)}>{today ? "Update mood" : "Log today's mood"}</Button>
          <p className="mt-4 text-xs text-muted-foreground">30-day average: <b className="text-foreground">{avg ? avg.toFixed(1) : "—"}/5</b> across {logged.length} check-ins</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-semibold">What lifts you</h3>
          <p className="mb-3 text-xs text-muted-foreground">Average mood on days you did vs skipped each habit.</p>
          {lifts.length === 0 ? <p className="text-sm text-muted-foreground">Log mood for a couple of weeks to unlock this.</p> : (
            <ul className="space-y-2">
              {lifts.slice(0, 5).map(({ h, l }) => (
                <li key={h.id} className="flex items-center gap-2 text-sm"><span>{h.emoji}</span><span className="flex-1 truncate">{h.name}</span><span className={cn("tabular font-semibold", Math.abs(l!.lift) < 0.05 ? "text-muted-foreground" : l!.lift > 0 ? "text-success" : "text-danger")}>{Math.abs(l!.lift) < 0.05 ? "±0.0" : `${l!.lift > 0 ? "+" : "−"}${Math.abs(l!.lift).toFixed(1)}`}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="p-6 xl:col-span-3">
        <h3 className="mb-3 font-display font-semibold">Last 60 days</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: -24, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" tickFormatter={(d) => formatDate(String(d))} tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" interval={9} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => formatDate(String(l))} formatter={(v) => [`${MOODS[Number(v) - 1]?.emoji} ${MOODS[Number(v) - 1]?.label}`, "Mood"]} />
              <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
