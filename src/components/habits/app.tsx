"use client";
import { useMemo } from "react";
import { CalendarHeart, LayoutDashboard, ListChecks, Plus, Smile, Sparkles, Target, Flame } from "lucide-react";
import { AppShell, type NavItem } from "@/components/kit/shell";
import { Dashboard } from "@/components/kit/dashboard";
import { useAssistant, type Insight } from "@/components/kit/assistant";
import type { Command } from "@/components/kit/command-palette";
import { useHabits, exportHabits } from "@/lib/habits/store";
import { buildMap, generateInsights, isDone, isScheduled, type HabitAction } from "@/lib/habits/logic";
import { greeting, todayISO } from "@/lib/utils";
import { useWidgetRegistry } from "./widgets";
import { GoalsView, HabitsView, MoodView } from "./views";
import { GoalDialog, HabitDialog, MoodDialog } from "./dialogs";
import { useHabitUI } from "./ui-state";

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "habits", label: "Habits", icon: ListChecks },
  { id: "goals", label: "Goals", icon: Target },
  { id: "mood", label: "Mood", icon: Smile },
];

export default function HabitApp() {
  const data = useHabits();
  const { view, setView, openHabit, openGoal, setMoodOpen } = useHabitUI();
  const setAssistantOpen = useAssistant((s) => s.setOpen);

  const insights: Insight[] = useMemo(() => {
    const exec = (a: HabitAction) => {
      const st = useHabits.getState();
      switch (a.kind) {
        case "check": return st.setCount(a.habitId, todayISO(), st.habits.find((h) => h.id === a.habitId)?.target ?? 1);
        case "setTime": return st.updateHabit(a.habitId, { timeOfDay: a.timeOfDay });
        case "ease": return st.easeHabit(a.habitId);
        case "logMood": setAssistantOpen(false); return setMoodOpen(true);
        case "view": setAssistantOpen(false); return setView(a.view);
      }
    };
    const done = (a: HabitAction) => a.kind === "check" ? "Checked off — nice! 🔥" : a.kind === "setTime" ? `Moved to the ${a.timeOfDay}` : a.kind === "ease" ? "Made it easier — consistency beats intensity" : undefined;
    return generateInsights(data, new Date()).map((r) => ({ ...r, actions: r.actions.map((x) => ({ label: x.label, run: () => exec(x.action), resolves: x.action.kind !== "view" && x.action.kind !== "logMood", done: done(x.action) })) }));
  }, [data, setView, setMoodOpen, setAssistantOpen]);

  const registry = useWidgetRegistry(insights);
  const map = useMemo(() => buildMap(data.checkins), [data.checkins]);
  const now = new Date();
  const todays = data.habits.filter((h) => !h.archived && isScheduled(h, now));
  const left = todays.filter((h) => !isDone(map, h, todayISO(now))).length;

  const commands: Command[] = useMemo(() => [
    { id: "new-habit", label: "New habit", group: "Create", icon: Plus, run: () => openHabit() },
    { id: "new-goal", label: "New goal", group: "Create", icon: Target, run: () => openGoal() },
    { id: "mood", label: "Log mood", group: "Create", icon: CalendarHeart, run: () => setMoodOpen(true) },
    ...data.habits.filter((h) => !h.archived).map((h) => ({ id: `chk-${h.id}`, label: `Toggle today: ${h.emoji} ${h.name}`, group: "Check in", icon: Flame, run: () => useHabits.getState().toggle(h.id), keywords: "done complete" })),
  ], [data.habits, openHabit, openGoal, setMoodOpen]);

  const scanSteps = [
    `Reviewing ${data.checkins.length} check-ins across ${data.habits.length} habits`,
    "Measuring streaks and recent consistency",
    "Finding the times you actually show up",
    `Correlating ${data.moods.length} mood logs with habits`,
    "Preparing nudges",
  ];

  const intro = (
    <div>
      <p className="text-sm text-muted-foreground">{greeting()} ✨</p>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{left === 0 && todays.length ? "You crushed today." : `${left} habit${left === 1 ? "" : "s"} left today`}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Sparkles className="size-4 shrink-0 text-primary" /><span>Small wins compound. Your coach has <b className="text-foreground">{insights.length}</b> observations.</span></p>
    </div>
  );

  return (
    <AppShell nav={NAV} view={view} onView={setView} logo={Flame} insights={insights} scanSteps={scanSteps} commands={commands} assistantName="Ritual Coach"
      hooks={{ exportData: exportHabits, importData: data.importData, clearDemo: data.clearDemo, loadDemo: data.loadDemo, isDemo: data.isDemo }}>
      {view === "dashboard" && <Dashboard registry={registry} intro={intro} />}
      {view === "habits" && <HabitsView />}
      {view === "goals" && <GoalsView />}
      {view === "mood" && <MoodView />}
      <HabitDialog />
      <GoalDialog />
      <MoodDialog />
    </AppShell>
  );
}
