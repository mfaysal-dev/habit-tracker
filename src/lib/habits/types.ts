export type Schedule = { kind: "daily" } | { kind: "weekdays"; days: number[] } | { kind: "times"; perWeek: number };
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type Habit = {
  id: string; name: string; emoji: string; color: string; schedule: Schedule; timeOfDay: TimeOfDay;
  target: number; unit?: string; createdAt: string; archived?: boolean;
};
export type Checkin = { habitId: string; date: string; count: number; time: string };
export type Milestone = { id: string; title: string; done: boolean; doneAt?: string };
export type Goal = { id: string; title: string; why?: string; deadline?: string; color: string; emoji: string; milestones: Milestone[]; habitIds: string[] };
export type Mood = { date: string; score: number; note?: string; tags: string[] };
export type HabitData = { habits: Habit[]; checkins: Checkin[]; goals: Goal[]; moods: Mood[]; isDemo: boolean };
