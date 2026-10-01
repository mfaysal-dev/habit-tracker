"use client";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useHabits } from "@/lib/habits/store";
import type { Goal, Habit, Milestone, Schedule, TimeOfDay } from "@/lib/habits/types";
import { cn, todayISO, uid } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { DAY_NAMES, MOODS, useHabitUI } from "./ui-state";

const COLORS = ["#8b5cf6", "#6366f1", "#0ea5e9", "#14b8a6", "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#ec4899"];
const EMOJIS = ["🧘", "💧", "📚", "🏋️", "✍️", "🗣️", "🌙", "🏃", "🥗", "🎸", "🧹", "💊", "🙏", "🚶", "💻", "🎨", "🌱", "☀️", "🦷", "📵"];
const TEMPLATES: Partial<Habit>[] = [
  { name: "Walk 8k steps", emoji: "🚶", timeOfDay: "anytime", color: "#14b8a6" },
  { name: "Stretch", emoji: "🧘", timeOfDay: "morning", color: "#8b5cf6" },
  { name: "Eat a vegetable", emoji: "🥗", timeOfDay: "afternoon", color: "#84cc16" },
  { name: "Floss", emoji: "🦷", timeOfDay: "evening", color: "#0ea5e9" },
  { name: "Pray", emoji: "🙏", timeOfDay: "anytime", color: "#f59e0b" },
];

export function HabitDialog() {
  const { habitDialog: initial, closeHabit } = useHabitUI();
  const open = initial !== undefined;
  const upsert = useHabits((s) => s.upsertHabit);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [color, setColor] = useState(COLORS[0]);
  const [kind, setKind] = useState<Schedule["kind"]>("daily");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [perWeek, setPerWeek] = useState(3);
  const [tod, setTod] = useState<TimeOfDay>("anytime");
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState("");
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? ""); setEmoji(initial?.emoji ?? "🌱"); setColor(initial?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)]);
    setKind(initial?.schedule.kind ?? "daily");
    setDays(initial?.schedule.kind === "weekdays" ? initial.schedule.days : [1, 2, 3, 4, 5]);
    setPerWeek(initial?.schedule.kind === "times" ? initial.schedule.perWeek : 3);
    setTod(initial?.timeOfDay ?? "anytime"); setTarget(initial?.target ?? 1); setUnit(initial?.unit ?? "");
  }, [open, initial]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const schedule: Schedule = kind === "daily" ? { kind } : kind === "weekdays" ? { kind, days: days.length ? days : [1] } : { kind, perWeek };
    upsert({ id: initial?.id, name: name.trim(), emoji, color, schedule, timeOfDay: tod, target: Math.max(1, target), unit: unit.trim() || undefined, archived: initial?.archived });
    toast(initial ? "Habit updated" : `${emoji} ${name} added`, initial ? undefined : "Small steps, every day.");
    closeHabit();
  };
  return (
    <Dialog open={open} onClose={closeHabit} title={initial ? "Edit habit" : "New habit"} description={initial ? undefined : "Make it so small you can't say no."} className="max-w-xl">
      <form onSubmit={save} className="space-y-4 pb-3">
        {!initial && (
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => <button type="button" key={t.name} onClick={() => { setName(t.name!); setEmoji(t.emoji!); setTod(t.timeOfDay!); setColor(t.color!); }} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">{t.emoji} {t.name}</button>)}
          </div>
        )}
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `color-mix(in oklch, ${color} 18%, transparent)` }}>{emoji}</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 10 pages" aria-label="Habit name" autoFocus />
        </div>
        <div className="flex flex-wrap gap-1">{EMOJIS.map((em) => <button type="button" key={em} onClick={() => setEmoji(em)} aria-label={`Emoji ${em}`} className={cn("grid size-8 place-items-center rounded-lg text-lg", emoji === em ? "bg-primary-soft ring-1 ring-primary" : "hover:bg-muted")}>{em}</button>)}</div>
        <div className="flex flex-wrap gap-2">{COLORS.map((c) => <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", color === c && "ring-2 ring-foreground/50")} style={{ background: c }} />)}</div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Schedule</p>
          <Segmented id="sched" value={kind} onChange={setKind} options={[{ value: "daily", label: "Daily" }, { value: "weekdays", label: "Specific days" }, { value: "times", label: "X per week" }]} />
          {kind === "weekdays" && <div className="mt-2 flex gap-1">{DAY_NAMES.map((d, i) => <button type="button" key={d} aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])} className={cn("h-9 flex-1 rounded-lg border text-xs font-medium", days.includes(i) ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted")}>{d}</button>)}</div>}
          {kind === "times" && <div className="mt-2 flex items-center gap-3"><input type="range" min={1} max={7} value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" aria-label="Times per week" /><span className="w-20 text-sm font-medium">{perWeek}× / week</span></div>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Best time" htmlFor="h-tod"><Select id="h-tod" value={tod} onChange={(e) => setTod(e.target.value as TimeOfDay)}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="anytime">Anytime</option></Select></Field>
          <Field label="Daily target" htmlFor="h-t"><Input id="h-t" type="number" min={1} max={50} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></Field>
          <Field label="Unit (optional)" htmlFor="h-u"><Input id="h-u" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="glasses, min…" /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={closeHabit}>Cancel</Button><Button type="submit">{initial ? "Save" : "Create habit"}</Button></div>
      </form>
    </Dialog>
  );
}

export function GoalDialog() {
  const { goalDialog: initial, closeGoal } = useHabitUI();
  const open = initial !== undefined;
  const { upsertGoal, habits } = useHabits();
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [deadline, setDeadline] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState(COLORS[0]);
  const [ms, setMs] = useState<Milestone[]>([]);
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? ""); setWhy(initial?.why ?? ""); setDeadline(initial?.deadline ?? ""); setEmoji(initial?.emoji ?? "🎯");
    setColor(initial?.color ?? COLORS[0]); setMs(initial?.milestones ?? []); setHabitIds(initial?.habitIds ?? []); setDraft("");
  }, [open, initial]);
  const addMs = () => { if (draft.trim()) { setMs([...ms, { id: uid(), title: draft.trim(), done: false }]); setDraft(""); } };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const extra = draft.trim() ? [{ id: uid(), title: draft.trim(), done: false }] : [];
    upsertGoal({ id: initial?.id, title: title.trim(), why: why.trim() || undefined, deadline: deadline || undefined, emoji, color, milestones: [...ms, ...extra], habitIds } as Goal);
    toast(initial ? "Goal updated" : "Goal created", "Break it into milestones and let habits carry you.");
    closeGoal();
  };
  return (
    <Dialog open={open} onClose={closeGoal} title={initial ? "Edit goal" : "New goal"} className="max-w-xl">
      <form onSubmit={save} className="space-y-4 pb-3">
        <div className="flex gap-3">
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} className="w-14 text-center text-lg" aria-label="Goal emoji" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run a half marathon" aria-label="Goal title" autoFocus />
        </div>
        <Field label="Why it matters" htmlFor="g-why"><Textarea id="g-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Your future self will thank you because…" className="min-h-16" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline (optional)" htmlFor="g-dl"><Input id="g-dl" type="date" value={deadline} min={todayISO()} onChange={(e) => setDeadline(e.target.value)} /></Field>
          <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Color</p><div className="flex flex-wrap gap-1.5">{COLORS.slice(0, 8).map((c) => <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} className={cn("size-6 rounded-full ring-offset-2 ring-offset-card", color === c && "ring-2 ring-foreground/50")} style={{ background: c }} />)}</div></div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Milestones</p>
          <ul className="space-y-1.5">{ms.map((m, i) => <li key={m.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5 text-sm"><span className="text-xs text-muted-foreground">{i + 1}.</span><span className="flex-1">{m.title}</span><button type="button" aria-label="Remove milestone" onClick={() => setMs(ms.filter((x) => x.id !== m.id))}><X className="size-3.5 text-muted-foreground" /></button></li>)}</ul>
          <div className="mt-2 flex gap-2"><Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMs(); } }} placeholder="Add a milestone and press Enter" aria-label="New milestone" /><Button type="button" variant="outline" size="icon" onClick={addMs} aria-label="Add milestone"><Plus /></Button></div>
        </div>
        {habits.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Supporting habits</p>
            <div className="flex flex-wrap gap-1.5">{habits.filter((h) => !h.archived).map((h) => <button type="button" key={h.id} aria-pressed={habitIds.includes(h.id)} onClick={() => setHabitIds(habitIds.includes(h.id) ? habitIds.filter((x) => x !== h.id) : [...habitIds, h.id])} className={cn("rounded-full border px-2.5 py-1 text-xs", habitIds.includes(h.id) ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted")}>{h.emoji} {h.name}</button>)}</div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={closeGoal}>Cancel</Button><Button type="submit">Save goal</Button></div>
      </form>
    </Dialog>
  );
}

const TAGS = ["work", "family", "friends", "sleep", "exercise", "stress", "outdoors", "health", "learning"];

export function MoodDialog() {
  const { moodOpen, setMoodOpen } = useHabitUI();
  const { moods, logMood } = useHabits();
  const today = todayISO();
  const existing = moods.find((m) => m.date === today);
  const [score, setScore] = useState(3);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => { if (moodOpen) { setScore(existing?.score ?? 3); setNote(existing?.note ?? ""); setTags(existing?.tags ?? []); } }, [moodOpen, existing]);
  return (
    <Dialog open={moodOpen} onClose={() => setMoodOpen(false)} title="How are you feeling?" description="Your mood log stays on this device.">
      <div className="space-y-5 pb-3">
        <MoodPicker value={score} onChange={setScore} />
        <div className="flex flex-wrap gap-1.5">{TAGS.map((t) => <button key={t} aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} className={cn("rounded-full border px-2.5 py-1 text-xs capitalize", tags.includes(t) ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted")}>{t}</button>)}</div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering? (optional)" aria-label="Mood note" />
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMoodOpen(false)}>Cancel</Button><Button onClick={() => { logMood(today, score, note.trim() || undefined, tags); toast(`Mood logged: ${MOODS[score - 1].label} ${MOODS[score - 1].emoji}`); setMoodOpen(false); }}>Save</Button></div>
      </div>
    </Dialog>
  );
}

export function MoodPicker({ value, onChange, compact }: { value?: number; onChange: (s: number) => void; compact?: boolean }) {
  return (
    <div className="flex justify-between gap-1.5" role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => (
        <button key={m.score} role="radio" aria-checked={value === m.score} aria-label={m.label} onClick={() => onChange(m.score)}
          className={cn("flex flex-1 flex-col items-center gap-1 rounded-2xl border transition hover:-translate-y-0.5", compact ? "py-2" : "py-3", value === m.score ? "border-transparent shadow-md" : "hover:bg-muted")}
          style={value === m.score ? { background: `color-mix(in oklch, ${m.color} 20%, transparent)`, borderColor: m.color } : undefined}>
          <span className={compact ? "text-xl" : "text-3xl"}>{m.emoji}</span>
          {!compact && <span className="text-[11px] font-medium">{m.label}</span>}
        </button>
      ))}
    </div>
  );
}
