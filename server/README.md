# LoopBoard API — Auth, Projects, Tasks & AI Backend

An Express + TypeScript REST API that powers authentication, project/task/team data, comments, notifications, analytics, and AI-assisted features for the LoopBoard dashboard.

Built as the backend of the LoopBoard full-stack developer productivity application, with PostgreSQL persistence through Prisma and a separate Next.js frontend.

---

## Tech Stack

| Layer      | Choice                                          |
| ---------- | ----------------------------------------------- |
| Runtime    | Node.js + Express                               |
| Language   | TypeScript                                      |
| Validation | Zod                                             |
| Database   | PostgreSQL                                      |
| ORM        | Prisma                                          |
| Auth       | JWT (httpOnly cookie) + bcrypt password hashing |
| OAuth      | Google (`google-auth-library`)                  |
| Email      | Nodemailer via Resend SMTP                      |
| AI         | Google Gemini (`@google/generative-ai`)         |

---

## Features

* Full CRUD for **Users**, **Projects**, **Tasks**, and **Team Members**, backed by PostgreSQL, with relational modeling — `Task.assigneeId` is a foreign key to `TeamMember`; `Project` ↔ `TeamMember` is many-to-many through the `ProjectMember` join table
* **Authentication**: register, login, logout, and session check (`/api/auth/me`) using an httpOnly JWT cookie
* **Google OAuth** sign-in, distinguished from password accounts through the `provider` field on `User`
* **Forgot-password / email reset** using single-use, SHA-256-hashed, 1-hour-expiry reset tokens
* **Password policy** shared with the frontend: minimum 8 characters, one uppercase letter, one number, and one special character
* **Task comments**: task-specific comments, author attribution, author-only deletion, and activity logging
* **Notification preferences**: per-user preferences for notification event types
* **AI endpoints**: task suggestion generation and project status summarization using Gemini
* Duplicate task names are rejected per project on creation, case-insensitively
* Centralized error handling using custom `AppError` classes and a single Express error-handling middleware
* Prisma constraint errors are translated into the API's `NotFoundError` / `ValidationError` response format
* Request validation with Zod on write operations
* Passwords are hashed with bcrypt before storage and are never returned in API responses
* Environment-based configuration through `.env`
* User/project authorization and ownership checks on protected resources

---

## Getting Started

```bash
cd server
npm install
cp .env.example .env
```

Fill in the required values in `.env`.

Then generate Prisma Client and configure the database:

```bash
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The server runs at:

```text
http://localhost:4000
```

by default.

You need a PostgreSQL database for `DATABASE_URL`.

For local development, you can use:

* Neon
* Supabase
* A local PostgreSQL installation
* PostgreSQL through Docker

Example Docker command:

```bash
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

---

## Scripts

```bash
npm run dev                 # start with hot-reload (ts-node-dev)
npm run build               # prisma generate + compile TypeScript
npm start                   # run compiled build
npm run prisma:migrate      # create/apply a migration in development
npm run prisma:deploy       # apply existing migrations (production/CI)
npm run prisma:seed         # populate sample data
npm run prisma:studio       # open Prisma Studio
```

### Production Migration

On a hosted deployment, pending Prisma migrations must be applied during the deployment process.

Use:

```bash
npx prisma migrate deploy
```

For example, the deployment platform can run the migration as a release/pre-deploy command before starting the application.

`npm start` by itself does not apply pending migrations unless the start script has explicitly been configured to do so.

---

## Environment Variables

| Variable               | Description                                       | Required                |
| ---------------------- | ------------------------------------------------- | ----------------------- |
| `PORT`                 | Port the server listens on                        | No — defaults to `4000` |
| `DATABASE_URL`         | PostgreSQL connection string                      | Yes                     |
| `JWT_SECRET`           | Secret used to sign session tokens                | Yes                     |
| `CLIENT_ORIGIN`        | Exact frontend origin used for CORS               | Yes                     |
| `GEMINI_API_KEY`       | Enables AI task suggestions and project summaries | For AI features         |
| `RESEND_API_KEY`       | Sends forgot-password emails                      | For password reset      |
| `EMAIL_FROM`           | From-address for outgoing email                   | For password reset      |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                            | For Google sign-in      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                        | For Google sign-in      |
| `GOOGLE_REDIRECT_URI`  | OAuth callback URL                                | For Google sign-in      |

See `.env.example` for the full annotated configuration.

Real values should only exist in the local `.env` or deployment platform environment variables.

---

## Project Structure

```text
server/
│
├── prisma/
│   ├── schema.prisma              # Prisma data model
│   ├── migrations/                # generated SQL migrations
│   └── seed.js                    # populates sample data
│
├── src/
│   ├── index.ts                   # app entry point, middleware & routers
│   │
│   ├── lib/
│   │   ├── prisma.ts              # shared PrismaClient instance
│   │   ├── jwt.ts                 # sign/verify session tokens
│   │   └── email.ts               # Nodemailer + Resend SMTP
│   │
│   ├── data/
│   │   └── store.ts               # Prisma-backed CRUD & business logic
│   │
│   ├── routes/
│   │   ├── auth.ts                # auth, password reset & Google OAuth
│   │   ├── users.ts
│   │   ├── projects.ts
│   │   ├── team.ts
│   │   ├── tasks.ts               # includes nested comment routes
│   │   ├── activity.ts
│   │   ├── dashboard.ts
│   │   ├── ai.ts                  # Gemini-backed endpoints
│   │   └── notifications.ts       # notification preferences
│   │
│   ├── schemas/
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── project.ts
│   │   ├── task.ts
│   │   ├── teamMember.ts
│   │   ├── comment.ts
│   │   └── ai.ts
│   │
│   ├── errors/
│   │   └── AppError.ts            # AppError & specialized errors
│   │
│   └── middleware/
│       ├── requireAuth.ts          # verifies session cookie
│       ├── errorHandler.ts         # centralized error responses
│       └── asyncHandler.ts         # async route wrapper
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

Shared types such as `Task`, `Project`, `User`, `TeamMember`, and `Comment` live in:

```text
/shared/types.ts
```

at the repository root and are imported by the backend through the `@shared/*` path alias.

---

## Data Model & Relationships

```text
User             — authentication identity
                   (email/password or Google)
                   1:1 NotificationPreference

TeamMember       — assignable people displayed by the dashboard

Project 1───* Task
                   Task.projectId
                   cascade delete

TeamMember 1───* Task
                   Task.assigneeId
                   nullable
                   set-null on delete

Project *───* TeamMember
                   via ProjectMember join table
                   cascade delete

Task 1───* Comment
                   Comment.taskId
                   cascade delete

User 1───* Comment
                   Comment.authorId
                   nullable
                   set-null on delete
                   denormalized authorName retained

User 1───* PasswordResetToken
                   cascade delete

User 1───1 NotificationPreference
                   cascade delete
```

`User` and `TeamMember` are intentionally separate concepts.

* `User` represents the authentication identity.
* `TeamMember` represents a person who can be displayed by the dashboard and assigned to tasks.
* Comments are authored by authenticated `User` accounts.
* Tasks are assigned to `TeamMember` records.

---

## Authentication

### JWT Authentication

On login or registration:

1. Credentials are validated.
2. The password is verified or hashed.
3. A JWT session token is created.
4. The token is stored in an httpOnly cookie.

The JWT is never exposed directly to client-side JavaScript.

`middleware/requireAuth.ts` verifies the session cookie on protected routes and attaches the authenticated user information to the request.

### Production Cookies

In production:

```text
secure: true
sameSite: "none"
```

This allows authentication cookies to work across separate frontend/backend origins such as a Vercel frontend and separately hosted backend.

In development, the cookie uses:

```text
sameSite: "lax"
```

for the local frontend/backend setup.

### Google OAuth

Google OAuth uses:

```text
GET /api/auth/google
GET /api/auth/google/callback
```

The flow:

1. Redirects the user to Google's consent screen.
2. Uses a CSRF state cookie.
3. Receives the OAuth callback.
4. Exchanges the authorization code.
5. Verifies the Google ID token.
6. Creates or retrieves the corresponding user.
7. Signs the normal LoopBoard session cookie.

Google-provider accounts are distinguished through the `provider` field.

### Forgot Password

The forgot-password flow uses:

```text
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Reset tokens:

* Are single-use
* Expire after one hour
* Are hashed with SHA-256 before storage
* Are never stored in raw form

---

## API Documentation

The complete endpoint reference is available in:

```text
API_DOCUMENTATION.md
```

### Quick Reference

All endpoints are protected by `requireAuth` except the authentication routes.

| Resource      | Base Path                 | Notes                                                     |
| ------------- | ------------------------- | --------------------------------------------------------- |
| Auth          | `/api/auth`               | register, login, logout, me, password reset, Google OAuth |
| Users         | `/api/users`              | CRUD operations                                           |
| Team          | `/api/team`               | CRUD operations                                           |
| Projects      | `/api/projects`           | CRUD operations                                           |
| Tasks         | `/api/tasks`              | CRUD operations                                           |
| Task Comments | `/api/tasks/:id/comments` | list, create, delete                                      |
| Activity      | `/api/activity`           | activity feed                                             |
| Dashboard     | `/api/dashboard`          | dashboard statistics                                      |
| AI            | `/api/ai`                 | task generation and project summarization                 |
| Notifications | `/api/notifications`      | notification preferences                                  |

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/google
GET  /api/auth/google/callback
```

### Users

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Team

```text
GET    /api/team
GET    /api/team/:id
POST   /api/team
PATCH  /api/team/:id
DELETE /api/team/:id
```

### Projects

```text
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### Tasks

```text
GET    /api/tasks
GET    /api/tasks/:id
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

### Task Comments

```text
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comments
DELETE /api/tasks/:id/comments/:commentId
```

### Activity

```text
GET /api/activity
```

### Dashboard

```text
GET /api/dashboard/stats
```

### AI

```text
POST /api/ai/tasks/generate
POST /api/ai/projects/summarize
```

### Notifications

```text
GET   /api/notifications/preferences
PATCH /api/notifications/preferences
```

---

## Authorization & Ownership

Protected resources are scoped to the authenticated user.

Project operations perform ownership/authorization checks before modifying project data.

This prevents one authenticated user from freely modifying another user's projects or related project data.

Team membership has two scopes:

### Account-level

Updating a team member changes their account-level team information.

### Project-level

Adding or removing a team member changes their membership in a specific project.

Removing a team member from a project does not automatically delete the team-member record.

---

## Task Comments

Comments are associated with individual tasks.

Each comment contains author information and is linked to the authenticated `User` who created it.

The API supports:

```text
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comments
DELETE /api/tasks/:id/comments/:commentId
```

Comment deletion is restricted to the comment author.

Comment creation is also recorded in the activity feed.

---

## Validation

Write operations use Zod schemas before reaching the data layer.

Invalid request data returns:

```text
400 Bad Request
```

This keeps malformed input from reaching Prisma/database operations.

Validation covers areas including:

* Authentication
* Users
* Projects
* Tasks
* Team members
* Comments
* AI requests

---

## Error Handling

The backend uses centralized error handling.

Custom errors include:

```text
AppError
NotFoundError
ValidationError
UnauthorizedError
```

Prisma errors such as invalid foreign keys or missing records are translated into the application's standard error format.

### Response Format

```json
{
  "error": {
    "message": "Task not found",
    "details": []
  }
}
```

### Status Codes

| Status | Meaning                                    |
| ------ | ------------------------------------------ |
| `400`  | Invalid request or validation failure      |
| `401`  | Authentication required or session invalid |
| `403`  | Authenticated but not authorized           |
| `404`  | Resource not found                         |
| `500`  | Unexpected server error                    |

---

## AI Features

The backend integrates with Google Gemini through:

```text
@google/generative-ai
```

Current AI functionality includes:

### Task Suggestions

```text
POST /api/ai/tasks/generate
```

Generates task suggestions based on the supplied request.

### Project Summaries

```text
POST /api/ai/projects/summarize
```

Generates an AI-assisted summary of project status.

These features require:

```env
GEMINI_API_KEY=...
```

---

## Email & Password Reset

Password-reset emails are sent using:

```text
Nodemailer
Resend SMTP
```

Required environment variables:

```env
RESEND_API_KEY=...
EMAIL_FROM=...
```

> **Known limitation:** without a verified sending domain on Resend, forgot-password emails only deliver to the address on the Resend account. This is suitable for self-testing but is not sufficient for general end-user password-reset delivery.

---

## Deployment

The backend is designed to run as a standard long-running Node.js service.

A typical production architecture is:

```text
Next.js Frontend
       │
       │ HTTPS / API requests
       ▼
Express Backend
       │
       ▼
PostgreSQL
```

The frontend and backend can be deployed separately, for example:

```text
Vercel
  │
  ▼
LoopBoard Next.js frontend
  │
  │ API requests + credentials
  ▼
Render / Node.js backend
  │
  ▼
Managed PostgreSQL
```

### Production Configuration

The following must be configured correctly:

* `CLIENT_ORIGIN` must exactly match the production frontend origin
* `NODE_ENV=production` must be set
* JWT secrets must be stored as deployment environment variables
* `DATABASE_URL` must point to the production PostgreSQL database
* Google OAuth redirect URI must match Google Cloud Console
* Pending Prisma migrations must be applied during deployment

Apply migrations with:

```bash
npx prisma migrate deploy
```

---

## Verification

Before pushing changes, run:

```bash
npx tsc --noEmit
npm run build
```

The current backend verification successfully completes:

```text
npx tsc --noEmit
npm run build
```

The production build runs:

```text
prisma generate && tsc
```

and successfully generates Prisma Client before compiling the TypeScript backend.

### ESLint

Running:

```bash
npx eslint
```

from the `server` directory currently reports that files matching `.` are ignored by the ESLint configuration.

This is an ESLint configuration/invocation issue and does not prevent the current TypeScript check or backend production build from succeeding.

---

## License

MIT
