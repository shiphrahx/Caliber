# Cadence

![Cadence Banner](public/banner_02.png)

![Next.js](https://img.shields.io/github/package-json/dependency-version/shiphrahx/Cadence/next?logo=nextdotjs)
![React](https://img.shields.io/github/package-json/dependency-version/shiphrahx/Cadence/react?logo=react)
![TypeScript](https://img.shields.io/github/package-json/dependency-version/shiphrahx/Cadence/dev/typescript?logo=typescript)
![Tailwind CSS](https://img.shields.io/github/package-json/dependency-version/shiphrahx/Cadence/dev/tailwindcss?logo=tailwindcss)

A lightweight web platform for engineering managers to run their day-to-day work. Brings together people management, tasks, meetings, follow-ups, and career development in one place.

## Features

**People & Teams**
- Manage team members with seniority levels, roles, and start dates
- Organise people into teams; track active/inactive status
- Per-person meeting history and team membership management

**People Radar**
- Attention signals per person (overdue tasks, no recent 1:1, ageing follow-ups, missing notes)
- Critical/warning severity scoring
- Schedule 1:1s and log evidence directly from the radar view

**Meetings**
- Full CRUD with recurrence support (weekly, fortnightly, monthly)
- Meeting types: 1:1, Team Sync, Retro, Planning, Review, Standup, Other
- Extract action items from meeting notes; auto-create tasks
- Tree-organised view by type and person/team

**Follow-ups**
- Track commitments made to team members
- Link follow-ups to meetings or log manually
- Overdue tracking with sidebar badge

**Tasks**
- Kanban board and backlog table views
- Drag-and-drop between columns
- Priority levels, due dates, week/backlog organisation

**Weekly Review & Summary**
- Structured weekly review with signal-based checklist
- AI-assisted summary generation (optional, requires API key)
- Editable summary with markdown output

**Evidence Bank**
- Log evidence per person for performance conversations

**Career Framework & Goals**
- Track career goals, gap analysis, and focus distributions
- Manage achievements and profile notes per person

**Settings**
- Profile management
- Meeting template CRUD with soft delete/restore

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI:** shadcn/ui + Radix UI
- **Database:** Supabase Postgres with Row Level Security
- **Auth:** Supabase Auth (Google OAuth)
- **Testing:** Vitest + React Testing Library

## Setup

1. Clone the repo
2. Create `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
3. Run the schema from `supabase/schema.sql` against your Supabase project
4. Run any migrations in `supabase/migrations/` in order
5. Configure Google OAuth in your Supabase dashboard
6. `npm install && npm run dev`

## Testing

```bash
npm run test:run      # run all tests once
npm test              # watch mode
npm run test:coverage # coverage report
```

91+ tests across service layer, components, and integration tests.

## Project Board

[github.com/users/shiphrahx/projects/2](https://github.com/users/shiphrahx/projects/2)
