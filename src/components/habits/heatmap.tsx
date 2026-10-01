"use client";
import { useMemo } from "react";
import { useHabits } from "@/lib/habits/store";
import { buildMap, heatmap } from "@/lib/habits/logic";
import { formatDate, parseISO } from "@/lib/utils";

export function Heatmap({ weeks = 26 }: { weeks?: number }) {
  const data = useHabits();
  const cols = useMemo(() => heatmap(data, buildMap(data.checkins), new Date(), weeks), [data, weeks]);
  const months: { idx: number; label: string }[] = [];
  cols.forEach((c, i) => {
    const d = parseISO(c[0].date);
    if (i === 0 || parseISO(cols[i - 1][0].date).getMonth() !== d.getMonth()) months.push({ idx: i, label: d.toLocaleDateString("en-US", { month: "short" }) });
  });
  const level = (s: number | null) => (s === null ? -1 : s === 0 ? 0 : s < 0.34 ? 1 : s < 0.67 ? 2 : s < 1 ? 3 : 4);
  const color = (l: number) => (l <= 0 ? "var(--color-muted)" : `color-mix(in oklch, var(--color-primary) ${[0, 30, 55, 78, 100][l]}%, var(--color-muted))`);
  return (
    <div className="w-full" style={{ minWidth: weeks * 9 }}>
      <div className="flex">
        <div className="w-8 shrink-0" />
        <div className="relative h-4 flex-1 text-[10px] text-muted-foreground">
          {months.map((m) => <span key={m.idx} className="absolute" style={{ left: `${(m.idx / weeks) * 100}%` }}>{m.label}</span>)}
        </div>
      </div>
      <div className="flex">
        <div className="grid w-8 shrink-0 grid-rows-7 gap-[3px] text-[9px] text-muted-foreground">
          {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => <span key={i} className="flex items-center">{d}</span>)}
        </div>
        <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {cols.map((col, i) => (
            <div key={i} className="grid grid-rows-7 gap-[3px]">
              {col.map((c) => (
                <span key={c.date} title={c.future ? "" : `${formatDate(c.date, { weekday: "short", month: "short", day: "numeric" })}: ${c.score === null ? "no habits scheduled" : `${Math.round(c.score * 100)}% complete`}`}
                  className="aspect-square max-h-5 w-full rounded-[4px] transition-transform hover:scale-125" style={{ opacity: c.future ? 0 : 1, background: color(level(c.score)) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        Less {[0, 1, 2, 3, 4].map((l) => <span key={l} className="rounded-[3px]" style={{ width: 10, height: 10, background: color(l) }} />)} More
      </div>
    </div>
  );
}

export function MiniHeat({ habitId, weeks = 12 }: { habitId: string; weeks?: number }) {
  const data = useHabits();
  const h = data.habits.find((x) => x.id === habitId)!;
  const cols = useMemo(() => {
    const sub = { ...data, habits: [h] };
    return heatmap(sub, buildMap(data.checkins.filter((c) => c.habitId === habitId)), new Date(), weeks);
  }, [data, h, habitId, weeks]);
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[2px]">
          {col.map((c) => <span key={c.date} className="size-[9px] rounded-[2px]" style={{ opacity: c.future ? 0 : 1, background: c.score ? `color-mix(in oklch, ${h.color} ${Math.round(35 + c.score * 65)}%, var(--color-muted))` : "var(--color-muted)" }} />)}
        </div>
      ))}
    </div>
  );
}
