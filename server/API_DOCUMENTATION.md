# LoopBoard API Documentation

Base URL (local): `http://localhost:4000`

All request/response bodies are JSON. All write operations (`POST`, `PATCH`) are validated with Zod — invalid data returns `400` before touching the data layer.

**Authentication:** every route below requires a valid session cookie *except* the ones under `/api/auth` (register, login, forgot-password, etc. — a user isn't logged in yet when hitting most of those). The cookie is set automatically by `/api/auth/register`, `/api/auth/login`, and the Google OAuth callback; requests from a browser just need `credentials: "include"` on `fetch`.

---

## Error Format

Every error response follows this shape:

```json
{
  "error": {
    "message": "Task not found",
    "details": []
  }
}
```

`details` is populated for `400` validation errors and contains the list of specific field issues.

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 204 | Success, no content (used for DELETE and some auth actions) |
| 400 | Invalid request body |
| 401 | Not logged in, or session invalid/expired |
| 403 | Logged in, but not permitted to perform this action |
| 404 | Resource not found |
| 500 | Unexpected server error |

---

## Auth

None of these routes require `requireAuth` — that's the point.

### `POST /api/auth/register`
Creates a user with a password account and logs them in (sets the session cookie).

**Request body**
```json
{
  "name": "Max Lee",
  "role": "Full-stack Engineer",
  "email": "max@xyz.com",
  "password": "SecurePass1!"
}
```
`password` must be at least 8 characters, with one uppercase letter, one number, and one special character. `email` must not already be registered — otherwise `400`.

**Response `201`** — the created user (password omitted), plus a `Set-Cookie` header.

### `POST /api/auth/login`
**Request body**
```json
{ "email": "max@xyz.com", "password": "SecurePass1!" }
```
Returns `401` for a wrong email/password, or if the account was created via Google — those get a clear message directing them to "Continue with Google" instead of a generic auth failure.

**Response `200`** — the user (password omitted), plus a `Set-Cookie` header.

### `POST /api/auth/logout`
Clears the session cookie.

**Response `204`**

### `GET /api/auth/me`
Returns the currently logged-in user, or `401` if there's no valid session. Used on app load to restore session state.

### `PATCH /api/auth/password`
Changes the logged-in user's password.

**Request body**
```json
{ "currentPassword": "OldPass1!", "newPassword": "NewPass2!" }
```
`currentPassword` is verified against the stored hash before the change is allowed — wrong current password returns `400`. `newPassword` follows the same complexity rule as registration.

**Response `204`**

### `POST /api/auth/forgot-password`
**Request body**
```json
{ "email": "max@xyz.com" }
```
Always returns the same `200` response regardless of whether the email is registered, to avoid leaking which addresses have accounts. If it *is* registered, an email is sent containing a link to `{CLIENT_ORIGIN}/reset-password?token=...`. The token is single-use and expires after 1 hour; only its hash is stored server-side.

**Response `200`**
```json
{ "message": "If that email is registered, a reset link has been sent." }
```

### `POST /api/auth/reset-password`
**Request body**
```json
{ "token": "the-raw-token-from-the-email-link", "newPassword": "NewPass2!" }
```
Returns `400` ("This reset link is invalid or has expired") if the token is unknown, already used, or past its 1-hour expiry.

**Response `204`**

### `GET /api/auth/google`
Redirects to Google's OAuth consent screen. Not meant to be called directly from JS — link/redirect the browser to it (e.g. a plain `<a href="/api/auth/google">`).

### `GET /api/auth/google/callback`
Handles the redirect back from Google, exchanges the auth code, verifies the ID token, creates or finds the matching user (`provider: "google"`), sets the session cookie, and redirects to `{CLIENT_ORIGIN}/dashboard`. On any failure, redirects to `{CLIENT_ORIGIN}/login?error=oauth_failed` instead of returning a JSON error, since the browser is mid-redirect at this point.

---

## Users

### `GET /api/users`
Returns all users. Passwords are never included in the response.

**Response `200`**
```json
[
  { "id": "u1", "name": "Sarah Patel", "role": "Frontend Engineer", "email": "sarah@xyz.com" }
]
```

### `GET /api/users/:id`
Returns a single user by id, or `404` if not found.

### `POST /api/users`
Creates a user. Password is hashed with bcrypt before storage.

**Request body**
```json
{
  "name": "Max Lee",
  "role": "Full-stack Engineer",
  "email": "max@xyz.com",
  "password": "securepass123"
}
```

**Response `201`** — same shape as `GET /:id`, password omitted.

### `PATCH /api/users/:id`
Partial update. Any subset of `name`, `role`, `email`, `password`. If `password` is included, it's re-hashed.

### `DELETE /api/users/:id`
Returns `204` on success, `404` if the user doesn't exist.

---

## Projects

### `GET /api/projects`
Returns all projects. `taskCount`/`completedTaskCount` are computed live from related tasks, not stored counters.

**Response `200`**
```json
[
  {
    "id": "clx1a2b3c",
    "name": "Design System v2",
    "description": "Unify tokens and components across product surfaces.",
    "status": "on-track",
    "progress": 72,
    "memberIds": ["clx9m1", "clx9m2", "clx9m3"],
    "members": ["Sarah Patel", "Alex Kim", "Jo Chen"],
    "taskCount": 24,
    "completedTaskCount": 17,
    "dueDate": "2026-09-15"
  }
]
```
`members` (names) is resolved server-side from `memberIds` and included for convenience — write requests should send `memberIds`, not `members`.

### `GET /api/projects/:id`
Single project by id, or `404`.

### `POST /api/projects`
**Request body**
```json
{
  "name": "New Project",
  "description": "Short description.",
  "status": "on-track",
  "progress": 0,
  "memberIds": ["clx9m1"],
  "dueDate": "2026-12-01"
}
```
`status` must be one of: `on-track`, `at-risk`, `delayed`, `completed`. `memberIds` must reference existing team members (`GET /api/team` for ids) — an unknown id returns `404`.

**Response `201`** — created project object.

### `PATCH /api/projects/:id`
Partial update of any field above. Sending `memberIds` replaces the full membership list (not a merge).

### `DELETE /api/projects/:id`
Returns `204` on success, `404` if not found. Deleting a project also deletes its tasks (cascade), which in turn deletes those tasks' comments (cascade).

---

## Tasks

### `GET /api/tasks`
Returns all tasks.

**Response `200`**
```json
[
  {
    "id": "clx1t1",
    "title": "Finalize color token naming",
    "status": "in-progress",
    "priority": "high",
    "projectId": "clx1a2b3c",
    "assigneeId": "clx9m1",
    "assignee": "Sarah Patel",
    "dueDate": "2026-08-25"
  }
]
```
`assignee` (name) is resolved server-side from `assigneeId` and included for convenience — write requests should send `assigneeId`, not `assignee`. `assigneeId` is `null` for unassigned tasks.

### `GET /api/tasks/:id`
Single task by id, or `404`.

### `POST /api/tasks`
**Request body**
```json
{
  "title": "Write release notes",
  "status": "todo",
  "priority": "medium",
  "projectId": "clx1a2b3c",
  "assigneeId": "clx9m2",
  "dueDate": "2026-09-10"
}
```
`status` must be one of: `todo`, `in-progress`, `review`, `done`.
`priority` must be one of: `low`, `medium`, `high`.
`projectId` must reference an existing project; `assigneeId` (optional) must reference an existing team member — either returns `404` if not found.
`title` must not duplicate an existing task's title within the same project (case-insensitive) — returns `400` if it does. This check only runs on create, not on rename via `PATCH`.

**Response `201`** — created task object. Also logs an activity event (`action: "created"`).

### `PATCH /api/tasks/:id`
Partial update — commonly used for status changes, e.g. `{ "status": "done" }`. Send `"assigneeId": null` to unassign a task. A `status` change logs an activity event (`action: "completed"` if moving to `done`, otherwise `"status-changed"`).

### `DELETE /api/tasks/:id`
Returns `204` on success, `404` if not found. Also deletes the task's comments (cascade).

---

## Task Comments

Nested under a task; all require `requireAuth`.

### `GET /api/tasks/:id/comments`
Returns all comments on the task, oldest first, or `404` if the task doesn't exist.

**Response `200`**
```json
[
  {
    "id": "cmt_1",
    "taskId": "clx1t1",
    "authorId": "u1",
    "authorName": "Sarah Patel",
    "body": "Blocked on the design tokens PR — following up today.",
    "createdAt": "2026-09-14T18:22:03.000Z"
  }
]
```
`authorName` is a snapshot taken when the comment was posted — it stays correct even if the author's account is later deleted, in which case `authorId` becomes `null`.

### `POST /api/tasks/:id/comments`
**Request body**
```json
{ "body": "Looks good, merging now." }
```
`body` must be non-empty and under 2000 characters. The author is taken from the session (`req.userId`/`req.userName`), not the request body. Also logs an activity event (`action: "commented"`, `detail` truncated to 80 characters).

**Response `201`** — the created comment.

### `DELETE /api/tasks/:id/comments/:commentId`
Deletes a comment. Returns `404` if the comment doesn't exist, `403` if it exists but wasn't authored by the logged-in user (you can only delete your own comments). Otherwise `204`.

---

## Team

### `GET /api/team`
Returns all team members.

**Response `200`**
```json
[
  { "id": "m1", "name": "Sarah Patel", "role": "Frontend Engineer", "email": "sarah@xyz.com" }
]
```

### `GET /api/team/:id`
Single member by id, or `404`.

### `POST /api/team`
**Request body**
```json
{ "name": "Priya Rao", "role": "Backend Engineer", "email": "priya@xyz.com" }
```

**Response `201`** — created member object.

### `PATCH /api/team/:id`
Partial update.

### `DELETE /api/team/:id`
Returns `204` on success, `404` if not found.

---

## Activity

### `GET /api/activity`
Returns the most recent activity events across the whole team (not per-user), newest first, capped at 20 by default.

**Response `200`**
```json
[
  {
    "id": "act_1",
    "actor": "Sarah Patel",
    "action": "commented",
    "target": "Finalize color token naming",
    "detail": "Blocked on the design tokens PR — following up today.",
    "timestamp": "2026-09-14T18:22:03.000Z"
  }
]
```
`action` is one of: `created`, `status-changed`, `completed`, `commented`.

---

## Dashboard

### `GET /api/dashboard/stats`
Returns the headline numbers shown on the dashboard.

**Response `200`**
```json
{
  "activeProjects": 6,
  "tasksCompletedThisWeek": 14,
  "tasksOverdue": 3,
  "teamMembers": 9
}
```
`tasksCompletedThisWeek` counts tasks marked `done` in the last 7 days. `tasksOverdue` counts non-`done` tasks past their `dueDate`.

---

## Notifications

### `GET /api/notifications/preferences`
Returns the logged-in user's notification preferences. Created with defaults on first access if none exist yet.

**Response `200`**
```json
{
  "id": "np_1",
  "userId": "u1",
  "taskAssigned": true,
  "taskOverdue": true,
  "comments": true,
  "weeklySummary": false
}
```

### `PATCH /api/notifications/preferences`
Partial update — any subset of `taskAssigned`, `taskOverdue`, `comments`, `weeklySummary` (all booleans).

**Response `200`** — the updated preferences.

> Note: this endpoint only stores the preference flags. Nothing in the backend currently reads them to decide whether to actually send a notification — there's no delivery mechanism (email/push/etc.) wired to any of these toggles yet.

---

## AI

### `POST /api/ai/projects/summarize`
**Request body**
```json
{ "projectId": "clx1a2b3c" }
```
Fetches the project and its tasks, and asks Gemini (`gemini-3.6-flash`) for a 3–5 sentence plain-prose status digest. Returns `404` if the project doesn't exist.

**Response `200`**
```json
{ "summary": "Design System v2 is progressing well at 72% complete, with 17 of 24 tasks done..." }
```

### `POST /api/ai/tasks/generate` — **not currently implemented**
The frontend (`src/lib/api/ai.ts` → `generateTaskSuggestions()`, used by `AITaskSuggestionsModal.tsx`) calls this route expecting AI-generated task suggestions back, but no matching route exists in `server/src/routes/ai.ts` — only `/projects/summarize` is registered. The request/response types (`generateTasksSchema`, `SuggestedTask`) and a couple of unused helper functions are already sitting in that file, unused, suggesting this was scaffolded but never finished. Calling this endpoint currently returns `404`. Needs to be built before that part of the UI will work.

---