# LoopBoard — Developer Productivity Dashboard

A full-stack developer productivity dashboard built with Next.js App Router and TypeScript. LoopBoard brings authentication, project tracking, task management, team visibility, AI-assisted summaries, and analytics together in one clean, responsive, theme-aware interface, backed by a real Express + PostgreSQL API.

**[Live Demo](https://loop-board-six.vercel.app/) · [Backend Documentation](./server/README.md)**

---

## Features

### Authentication

- Email/password registration and login, with passwords hashed via bcrypt
- Google OAuth ("Continue with Google") as an alternative sign-in path
- Forgot-password / email reset flow — a single-use, time-limited reset link sent via email
- Password policy (minimum 8 characters, one uppercase letter, one number, one special character) enforced identically on the client and server, with a live inline checklist while typing on the register, reset-password, and change-password forms
- Session persistence via an httpOnly JWT cookie — no tokens in local storage

### Dashboard

At-a-glance statistics for:

- Active projects
- Tasks completed this week
- Overdue tasks
- Team size

- Click-through stat cards with deep-linkable filtered views
- Project overview cards with progress bars, avatar stacks, status badges, task counts, and due dates
- Debounced project search
- Status filtering with filter state persisted in the URL
- Recent activity feed showing task creation, status changes, comments, and completions in real time

### Tasks

#### List View

- Search tasks by title or assignee
- Filter by priority
- Sort by due date, priority, or title
- Multi-select tasks with bulk status updates
- Create, edit, delete, and reassign tasks
- Duplicate task names are rejected per-project on creation

#### Kanban Board

- Drag-and-drop workflow using `@dnd-kit/core`
- Columns: To Do, In Progress, In Review, Done
- Optimistic UI updates with automatic rollback on failure
- Task CRUD directly from the board

#### Task Comments

- Threaded comments on any task, visible to every project member
- Comments are attributed to the logged-in user and timestamped
- Users can delete their own comments
- Posting a comment logs an activity event, visible in the notifications dropdown and dashboard feed

#### Deep Linking

Filtered task views open directly through URL parameters:

```
/tasks?status=done
/tasks?overdue=true
```

### Projects

#### Project List

Searchable project directory with status filtering, live progress indicators, task counts, due dates, and team member avatars.

#### Project Details

Each project has its own detail page with the project overview, progress, due date, team members and roles, and project-scoped task management. Also includes an **AI-generated status summary** — a one-click, 3–5 sentence prose digest of the project's current state, generated from its live task data.

### Team

A centralized team directory displaying members, roles, avatars, and project participation.

### Analytics

Visual analytics powered by Recharts, built from live task and project data:

- Task status breakdown (donut chart)
- Project progress comparison (bar chart)

### AI Features

- **Task suggestions** — generates candidate tasks for a project from its context
- **Project summarization** — condenses a project's tasks and status into a short prose digest

Both are powered by Gemini and require a `GEMINI_API_KEY` on the backend.

### Productivity Tools

#### Command Palette

Press `Ctrl+K` (or `⌘K`) to open the global command palette. Searches live projects, tasks, and team members — not mock data — with keyboard navigation, arrow-key selection, Enter to navigate, and Escape to close.

#### Notifications

The notification bell reflects real activity from the team feed (task creation, status changes, completions, comments), not a static mock list. Unread state is derived from a locally stored "last seen" timestamp — opening the dropdown marks the current time as seen for next time, without changing what's marked unread in the view you're currently looking at.

### Settings

#### Profile

Update name and role, backed by real data — changes persist across sessions.

#### Security

Change your password (requires your current password), governed by the same complexity policy and inline strength checklist as registration.

#### Appearance

Light, dark, or system theme, persisted across the application with no flash of unstyled content on load.

#### Notifications

Toggle which application events generate notifications (task assigned, task overdue, comments, weekly summary).

#### Developer Controls

Demo/testing controls to:

- Force simulated API errors
- Override network delay

These now apply to **real API calls**, not a mock layer — useful for demonstrating loading, error, and retry states against the actual backend.

### UX & Polish

- Responsive layouts for mobile, tablet, and desktop
- Keyboard-accessible interactions and focus-visible states
- Loading skeletons, empty states, and error banners with retry actions
- Optimistic UI updates with automatic rollback
- Debounced search and URL-persisted filters
- Light/dark theme support with no flash of unstyled content
- Dedicated landing page before entering the dashboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Design System | Tailwind `@theme` design tokens |
| Icons | lucide-react |
| Theming | next-themes |
| Drag & Drop | `@dnd-kit/core` |
| Charts | Recharts |
| Backend | Express REST API (see [`server/`](./server)) |
| Database | PostgreSQL via Prisma |
| Auth | JWT (httpOnly cookie) + Google OAuth |
| AI | Gemini |
| Shared Types | TypeScript types shared between frontend and backend via `@shared/*` |

---

## Architecture

LoopBoard is full-stack by default — every screen reads and writes through the Express API in [`server/`](./server), which persists to a real Postgres database via Prisma. There is no mock-data fallback: the frontend always needs `NEXT_PUBLIC_API_URL` pointed at a running backend to function.

For backend setup, environment variables, and the full API reference, see [`server/README.md`](./server/README.md).

---

## Getting Started

### Prerequisites

- Node.js
- npm
- A running instance of the backend (see [`server/README.md`](./server/README.md)) — the frontend has nothing to render without it

### Installation

```bash
git clone <repo-url>
cd LoopBoard
npm install
```

### Configure the API URL

Create `.env.local` at the project root:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Point this at your deployed backend URL in production.

### Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll first see the **Get Started** landing page — continue through it, then register or log in to enter the dashboard.

### Available Scripts

```bash
npm run dev          # start the development server
npm run build         # create a production build
npm run lint           # run ESLint
npx tsc --noEmit        # type-check without emitting files
```

---

## Project Structure

```
LoopBoard/
│
├── src/
│   ├── app/
│   │   ├── page.tsx                    # landing page
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── team/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar, Sidebar, AppShell
│   │   │   ├── ProfileMenu
│   │   │   ├── ThemeProvider, ThemeToggle
│   │   │   ├── NotificationsDropdown        # live Activity data
│   │   │   └── CommandPalette                # live search data
│   │   │
│   │   ├── ui/
│   │   │   ├── Card, Badge, ProgressBar
│   │   │   ├── Avatar, AvatarStack
│   │   │   ├── Skeleton, EmptyState, ConfirmDialog
│   │   │   └── PasswordStrengthHints
│   │   │
│   │   └── dashboard/
│   │       ├── StatsRow, ProjectCard, TaskCard
│   │       ├── KanbanBoard, ActivityFeed
│   │       ├── AnalyticsCharts
│   │       ├── TaskFormModal                  # includes TaskComments when editing
│   │       ├── TaskComments
│   │       ├── ProjectFormModal
│   │       ├── AITaskSuggestionsModal
│   │       └── SearchFilterBar
│   │
│   ├── lib/
│   │   ├── api.ts                       # fetch wrapper (credentials, error handling)
│   │   ├── api/
│   │   │   ├── auth.ts, users.ts, tasks.ts, projects.ts, team.ts
│   │   │   ├── comments.ts, notifications.ts, ai.ts, dashboard.ts
│   │   ├── auth/AuthContext.tsx           # session state, login/register/logout
│   │   ├── passwordRules.ts                # shared client-side password policy
│   │   ├── devConfig.ts                     # Developer Controls (delay/error injection)
│   │   ├── utils.ts
│   │   └── hooks/useDebounce.ts
│   │
│   └── types/index.ts                       # re-exports from shared/types.ts
│
├── shared/
│   └── types.ts
│
├── server/
│   └── README.md
│
├── public/
│   └── images/
│
└── package.json
```

---

## Design Notes

### Tailwind CSS v4

LoopBoard uses Tailwind CSS v4 with semantic design tokens defined through `@theme` in `globals.css` — `surface`, `surface-raised`, `surface-border`, `ink`, `ink-muted`, `accent`, `status-*` — so the interface adapts consistently between light and dark themes.

### Optimistic Updates

Interactions such as Kanban drag-and-drop and bulk task updates apply immediately in the UI while the request is in flight, and roll back automatically if the request fails.

### Password Policy

The same rules live in one place on each side — `src/lib/passwordRules.ts` on the frontend, `server/src/schemas/auth.ts` on the backend — so client-side validation and server-side rejection always agree. If you change the policy, update both.

---

## Backend

The companion Express + PostgreSQL API lives in [`server/`](./server). See the [Backend README](./server/README.md) for installation, environment variables, the data model, authentication details, and the full API reference.

---

## License

MIT