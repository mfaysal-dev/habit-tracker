"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { Ring } from "@/components/ui/progress";
import type { Habit } from "@/lib/habits/types";
import { useHabits } from "@/lib/habits/store";
import { cn, todayISO } from "@/lib/utils";

function Burst({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span key={i} className="absolute left-1/2 top-1/2 size-1.5 rounded-full" style={{ background: i % 2 ? color : "var(--color-warning)" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 28, y: Math.sin(a) * 28, opacity: 0, scale: 0.4 }} transition={{ duration: 0.6, ease: "easeOut" }} />
        );
      })}
    </span>
  );
}

export function HabitCheck({ habit, date = todayISO(), size = 44 }: { habit: Habit; date?: string; size?: number }) {
  const count = useHabits((s) => s.checkins.find((c) => c.habitId === habit.id && c.date === date)?.count ?? 0);
  const toggle = useHabits((s) => s.toggle);
  const increment = useHabits((s) => s.increment);
  const [burst, setBurst] = useState(0);
  const done = count >= habit.target;

  if (habit.target > 1) {
    return (
      <div className="flex items-center gap-1">
        <button aria-label={`Decrease ${habit.name}`} onClick={() => increment(habit.id, date, -1)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30" disabled={count === 0}><Minus className="size-3.5" /></button>
        <button aria-label={`Add one ${habit.unit ?? ""} to ${habit.name} (${count}/${habit.target})`} onClick={() => { increment(habit.id, date, 1); if (count + 1 === habit.target) setBurst((b) => b + 1); }} className="relative">
          <Ring value={(count / habit.target) * 100} size={size} stroke={4} color={habit.color}>
            {done ? <Check className="size-4" style={{ color: habit.color }} /> : <span className="tabular text-[11px]">{count}/{habit.target}</span>}
          </Ring>
          <AnimatePresence>{burst > 0 && <Burst key={burst} color={habit.color} />}</AnimatePresence>
        </button>
        <button aria-label={`Increase ${habit.name}`} onClick={() => { increment(habit.id, date, 1); if (count + 1 === habit.target) setBurst((b) => b + 1); }} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><Plus className="size-3.5" /></button>
      </div>
    );
  }
  return (
    <motion.button whileTap={{ scale: 0.85 }} aria-pressed={done} aria-label={`${done ? "Undo" : "Complete"} ${habit.name}`}
      onClick={() => { toggle(habit.id, date); if (!done) setBurst((b) => b + 1); }}
      className={cn("relative grid shrink-0 place-items-center rounded-full border-2 transition-colors", done ? "border-transparent text-white" : "border-dashed hover:bg-muted")}
      style={{ width: size, height: size, background: done ? habit.color : undefined, borderColor: done ? undefined : `color-mix(in oklch, ${habit.color} 55%, transparent)` }}>
      <AnimatePresence mode="wait">{done && <motion.span key="c" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><Check className="size-5" strokeWidth={3} /></motion.span>}</AnimatePresence>
      <AnimatePresence>{burst > 0 && <Burst key={burst} color={habit.color} />}</AnimatePresence>
    </motion.button>
  );
}
