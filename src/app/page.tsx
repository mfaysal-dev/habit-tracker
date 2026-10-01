"use client";
import dynamic from "next/dynamic";

const HabitApp = dynamic(() => import("@/components/habits/app"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="size-2.5 animate-ping rounded-full bg-primary" /> Warming up your rituals…</div>
    </div>
  ),
});

export default function Page() {
  return <HabitApp />;
}
