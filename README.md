# Ritual — tiny habits, big arcs

A beautiful, privacy-first habit & goal tracker that runs **entirely in your browser**. No accounts, no backend, no API keys — data lives in `localStorage` with JSON export/import.

**Live:** _see repo homepage_

## Features
- **Habits with real schedules** — daily, specific weekdays, or X-times-per-week; count targets (e.g. 8 glasses of water); time-of-day grouping; archive/restore.
- **Streaks** — current & best streaks (days or weeks), streak leaderboard, satisfying check-in animations.
- **Heatmap calendar** — GitHub-style consistency heatmap (6–12 months) plus a mini heatmap per habit.
- **Goals with milestones** — deadlines, "why it matters", supporting habits.
- **Mood log** — one-tap mood + tags + notes, monthly mood calendar, 60-day trend, and "what lifts you" (mood on done vs skipped days).
- **Customizable dashboard** — drag to reorder, S/M/L/XL resize, add/remove widgets (Today, Coach brief, Heatmap, Numbers, Streaks, Mood, Goals, Weekly completion, When you show up). Layout is saved.
- **Ritual Coach** — a rule-based, fully on-device assistant: detects slipping habits, protects streaks at risk in the evening, finds the time you *actually* do each habit and suggests moving it, makes struggling habits easier, celebrates milestones, spots mood lifts and at-risk goals — each with one-click actions.
- Command palette (`Ctrl/⌘ + K`), `Ctrl/⌘ + .` for the coach, dark/light/system theme, accent picker, friendly demo data with "Clear demo data".

## Stack
Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style components · framer-motion · lucide-react · recharts · dnd-kit · zustand · vitest

## Develop
```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```
