import type { WidgetSize } from "@/lib/ui-store";

export const APP = {
  name: "Ritual",
  tagline: "Tiny habits, big arcs",
  storageKey: "ritual",
  defaultAccent: 290,
  defaultLayout: [
    { type: "today", size: "l" },
    { type: "assistant", size: "s" },
    { type: "heatmap", size: "l" },
    { type: "stats", size: "s" },
    { type: "streaks", size: "s" },
    { type: "mood", size: "s" },
    { type: "goals", size: "s" },
    { type: "weekly", size: "m" },
    { type: "timeofday", size: "m" },
  ] as { type: string; size: WidgetSize }[],
};
