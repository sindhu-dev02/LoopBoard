# LoopBoard API — Auth, Projects, Tasks & AI Backend

An Express + TypeScript REST API that powers authentication, project/task/team data, comments, notifications, and AI-assisted features for the LoopBoard dashboard. Built across the four tasks of the Innovation Hacks Full Stack Development Internship — REST API, database integration, real authentication, and the feature set beyond it.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + Express |
| Language | TypeScript |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (httpOnly cookie) + bcrypt password hashing |
| OAuth | Google (`google-auth-library`) |
| Email | Nodemailer via Resend SMTP |
| AI | Google Gemini (`@google/generative-ai`) |

---

## Features

- Full CRUD for **Users**, **Projects**, **Tasks**, and **Team Members**, backed by PostgreSQL, with real relational modeling — `Task.assigneeId` is a foreign key to `TeamMember`; `Project` ↔ `TeamMember` is many-to-many via an explicit `ProjectMember` join table
- **Authentication**: register, login, logout, session check (`/api/auth/me`), all via an httpOnly JWT cookie
- **Google OAuth** sign-in, distinguished from password accounts via a `provider` field on `User`
- **Forgot-password / email reset**: single-use, SHA-256-hashed, 1-hour-expiry reset tokens; the raw token is never stored, only ever emailed
- **Password policy** shared with the frontend: minimum 8 characters, one uppercase letter, one number, one special character — enforced identically on register, change-password, and reset-password
- **Task comments**: threaded per task, author-attributed, author-only delete, logged to the activity feed
- **Notification preferences**: per-user, toggle which event types matter to them
- **AI endpoints**: task suggestion generation and project status summarization, both via Gemini
- Duplicate task names are rejected per-project on creation (case-insensitive)
- Centralized error handling via custom `AppError` classes and a single Express error-handling middleware — Prisma constraint errors (bad foreign keys, missing records) are translated into the same `NotFoundError` / `ValidationError` shape as everything else
- Request validation with Zod on every write operation — malformed requests return `400` before touching the data layer
- Passwords hashed with bcrypt before storage; never returned in API responses
- Environment-based configuration via `.env` — no credentials in source control

---

## Getting Started

```bash
cd server
npm install                    # also runs `prisma generate` via postinstall
cp .env.example .env           # then fill in the values below
npm run prisma:migrate         # creates tables from prisma/schema.prisma
npm run prisma:seed            # loads sample projects/tasks/team members
npm run dev
```

Server runs at `http://localhost:4000` by default (configurable via `.env`).

You need a Postgres database to point `DATABASE_URL` at. Easiest options for local dev:
- A free hosted instance on [Neon](https://neon.tech) or [Supabase](https://supabase.com) — copy the connection string they give you.
- Or run Postgres locally / via Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`.

### Scripts

```bash
npm run dev               # start with hot-reload (ts-node-dev)
npm run build              # prisma generate + compile TypeScript
npm start                   # run compiled build
npm run prisma:migrate       # create/apply a migration in dev
npm run prisma:deploy         # apply existing migrations (production/CI)
npm run prisma:seed            # (re)populate sample data
npm run prisma:studio           # open Prisma's DB browser GUI
```

> **Production note:** on a hosted deploy, make sure pending migrations get applied on every release — either via a platform-specific release/pre-deploy command running `npx prisma migrate deploy`, or by prepending it to the start script (`"start": "npx prisma migrate deploy && node dist/index.js"`). `npm start` alone does not apply migrations.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Port the server listens on | No (defaults to `4000`) |
| `DATABASE_URL` | Postgres connection string | Yes |
| `JWT_SECRET` | Secret used to sign session tokens | Yes |
| `CLIENT_ORIGIN` | Exact origin of the frontend, for CORS | Yes |
| `GEMINI_API_KEY` | Enables AI task suggestions and project summaries | For AI features |
| `RESEND_API_KEY` | Sends forgot-password emails | For password reset |
| `EMAIL_FROM` | From-address for outgoing email | For password reset |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | For Google sign-in |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL, must match Google Cloud Console exactly | For Google sign-in |

See `.env.example` for the full annotated template — real values live only in your local `.env`, which is gitignored.

> **Known limitation:** without a verified sending domain on Resend, forgot-password emails only deliver to the address on your own Resend account — fine for self-testing, not yet for real end users.

---

## Project Structure

```
server/
  prisma/
    schema.prisma           # data model
    migrations/                # generated SQL migrations
    seed.js                      # populates sample data
  src/
    index.ts                       # app entry point, middleware & router mounting
    lib/
      prisma.ts                      # shared PrismaClient instance
      jwt.ts                          # sign/verify session tokens
      email.ts                         # nodemailer + Resend SMTP
    data/
      store.ts                         # Prisma-backed CRUD + business logic
    routes/
      auth.ts                          # register, login, logout, me, password,
                                        #   forgot/reset-password, Google OAuth
      users.ts, projects.ts, team.ts
      tasks.ts                          # includes nested comment routes
      activity.ts, dashboard.ts
      ai.ts                             # Gemini-backed endpoints
      notifications.ts                   # notification preferences
    schemas/
      auth.ts, user.ts, project.ts, task.ts, teamMember.ts, comment.ts, ai.ts
    errors/
      AppError.ts              # AppError, NotFoundError, ValidationError, UnauthorizedError
    middleware/
      requireAuth.ts             # verifies the session cookie, attaches req.userId/userName
      errorHandler.ts             # centralized error-response formatting
      asyncHandler.ts              # wraps async routes so thrown errors reach errorHandler
  .env.example
  package.json
  tsconfig.json
```

Shared types (`Task`, `Project`, `User`, `TeamMember`, `Comment`, etc.) live in `/shared/types.ts` at the repo root and are imported here via the `@shared/*` path alias, kept identical to what the frontend uses.

---

## Data Model & Relationships

```
User             — auth identity (email/password or Google), 1:1 NotificationPreference
TeamMember       — assignable people (separate from User)
Project 1───* Task                    (Task.projectId, cascade delete)
TeamMember 1───* Task                 (Task.assigneeId, nullable, set-null on delete)
Project *───* TeamMember              (via ProjectMember join table, cascade delete)
Task 1───* Comment                    (Comment.taskId, cascade delete)
User 1───* Comment                    (Comment.authorId, nullable, set-null on delete —
                                        the comment survives with a denormalized authorName)
User 1───* PasswordResetToken         (cascade delete)
User 1───1 NotificationPreference     (cascade delete)
```

`User` and `TeamMember` remain intentionally separate: `User` is the authentication identity, `TeamMember` is the "who can this task be assigned to" concept the dashboard displays. Comments are authored by `User`s (the logged-in account), while task assignment still points at `TeamMember`s.

---

## Authentication

- On login/register, a JWT is signed (`lib/jwt.ts`) and set as an httpOnly cookie — never exposed to client-side JavaScript.
- `middleware/requireAuth.ts` verifies that cookie on every protected route and attaches `req.userId` / `req.userName` for handlers to use.
- In production (`NODE_ENV=production`), the cookie is set with `secure: true` and `sameSite: "none"` so it works across the separate frontend/backend origins typical of a Vercel + Render/Railway deployment; in development it's `sameSite: "lax"` since both run on `localhost`.
- **Google OAuth**: `GET /api/auth/google` redirects to Google's consent screen with a CSRF state cookie; `GET /api/auth/google/callback` exchanges the code, verifies the ID token, and signs the same session cookie. Accounts created this way get a `provider` of `"google"` and a random password they never see; password-login attempts against a Google-provider account are rejected with a clear message rather than a generic wrong-password error.
- **Forgot password**: `POST /api/auth/forgot-password` emails a reset link containing a raw token; only its SHA-256 hash is stored, with a 1-hour expiry and single-use enforcement. `POST /api/auth/reset-password` consumes it.
- All `/api/auth/*` routes are intentionally public (no `requireAuth`) — a user isn't logged in yet when hitting most of them.

---

## API Documentation

See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the full endpoint reference, including request/response examples for every route.

**Quick reference** (all behind `requireAuth` except `/api/auth/*`):

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, logout, me, password, forgot-password, reset-password, google, google/callback |
| Users | `/api/users` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Team | `/api/team` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Projects | `/api/projects` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Tasks | `/api/tasks` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Task Comments | `/api/tasks/:id/comments` | `GET /`, `POST /`, `DELETE /:commentId` |
| Activity | `/api/activity` | `GET /` |
| Dashboard | `/api/dashboard` | `GET /stats` |
| AI | `/api/ai` | `POST /tasks/generate`, `POST /projects/summarize` |
| Notifications | `/api/notifications` | `GET /preferences`, `PATCH /preferences` |

---

## Error Response Format

All errors return a consistent shape:

```json
{
  "error": {
    "message": "Task not found",
    "details": []
  }
}
```

| Status | Meaning |
|---|---|
| 400 | Validation failed on request body, or an invalid foreign key was referenced |
| 401 | Not logged in, or session invalid/expired |
| 403 | Logged in, but not permitted to perform this action (e.g. deleting another user's comment) |
| 404 | Resource not found |
| 500 | Unexpected server error |

---

## Deployment

The backend deploys as a standard long-running Node service (e.g. Render), paired with a managed Postgres instance (e.g. Neon) and a separately hosted frontend (e.g. Vercel). Key things to get right:

- `CLIENT_ORIGIN` on the backend must exactly match the frontend's production URL — CORS with `credentials: true` rejects mismatches silently, no wildcard allowed.
- `NODE_ENV=production` must be set for the auth cookie to switch to `secure`/`sameSite: none`, required for the cookie to survive a cross-origin frontend/backend split.
- `GOOGLE_REDIRECT_URI` and the corresponding entry in Google Cloud Console's authorized redirect URIs must both point at the production callback URL, not just localhost.
- Pending Prisma migrations need to be applied on every deploy — see the production note under **Scripts** above.

---

## License

MIT