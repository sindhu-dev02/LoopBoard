# LoopBoard

A full-stack developer productivity and project management application for organizing projects, tasks, team members, comments, notifications, analytics, and AI-assisted features in one place.

LoopBoard is built with **Next.js, TypeScript, Node.js, Express, Prisma, and PostgreSQL**, with a separate frontend and backend architecture.

---

## Tech Stack

| Layer               | Choice                          |
| ------------------- | ------------------------------- |
| Frontend            | Next.js 16 + React + TypeScript |
| Styling             | Tailwind CSS                    |
| Runtime             | Node.js + Express               |
| Language            | TypeScript                      |
| Validation          | Zod                             |
| Database            | PostgreSQL                      |
| ORM                 | Prisma                          |
| Auth                | JWT (httpOnly cookie) + bcrypt  |
| OAuth               | Google OAuth                    |
| Email               | Nodemailer via Resend SMTP      |
| AI                  | Google Gemini                   |
| Frontend Deployment | Vercel                          |
| Backend Deployment  | Render / Node.js hosting        |

---

## Features

### Authentication

* User registration and login
* Logout
* Session checking through `/api/auth/me`
* JWT authentication using an httpOnly cookie
* Google OAuth sign-in
* Forgot-password and reset-password flow
* Password validation and secure password hashing with bcrypt
* Separate handling for Google-provider and password-provider accounts

### Dashboard

* Personalized dashboard
* Project statistics
* Task statistics
* Activity information
* Team information
* Productivity-related data
* AI-assisted project information

### Projects

* Create projects
* View projects belonging to the authenticated user
* View individual project details
* Edit projects
* Delete projects
* Project ownership and authorization checks
* Assign team members to projects
* Remove team members from individual projects
* Project deletion cascades to associated tasks

### Tasks

* Create tasks
* View tasks
* Edit tasks
* Delete tasks
* Assign tasks to team members
* Project-based task organization
* Duplicate task-name protection within a project
* Task comments
* Activity tracking

### Team Members

* Create team members
* View the complete team roster
* Edit team-member information
* Delete team members
* Add team members to projects
* Remove team members from individual projects

Editing a team member updates their account-level information, while removing a member from a project only changes that project's membership.

### Task Comments

* Add comments to tasks
* View task comments
* Author attribution
* Author-only comment deletion
* Comment activity tracking

### Notifications

* Per-user notification preferences
* Configure which notification event types matter to the user

### AI Features

* AI-generated task suggestions
* AI-generated project status summaries
* Google Gemini integration

### Analytics

* Productivity and project-related analytics
* Dashboard statistics and activity information

---

## Getting Started

### Prerequisites

Make sure you have:

* Node.js
* npm
* PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/sindhu-dev02/LoopBoard.git
cd LoopBoard
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure frontend environment variables

Create:

```text
.env.local
```

in the project root.

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Use the appropriate backend URL for your environment.

### 4. Install backend dependencies

```bash
cd server
npm install
```

### 5. Configure backend environment variables

Create:

```text
server/.env
```

Configure the required PostgreSQL, authentication, email, OAuth, and AI variables.

See [`server/.env.example`](./server/.env.example) for the complete template.

### 6. Generate Prisma Client

From the `server` directory:

```bash
npx prisma generate
```

### 7. Apply database migrations

For development:

```bash
npm run prisma:migrate
```

For production/CI:

```bash
npm run prisma:deploy
```

### 8. Seed the database

If sample data is required:

```bash
npm run prisma:seed
```

### 9. Start the backend

From:

```text
LoopBoard/server
```

run:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:4000
```

by default.

### 10. Start the frontend

Open another terminal:

```bash
cd LoopBoard
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:3000
```

---

## Scripts

### Frontend

```bash
npm run dev       # start Next.js development server
npm run build     # create production build
npm run start     # start production server
npx tsc --noEmit  # TypeScript check
npx eslint        # run ESLint
```

### Backend

From the `server` directory:

```bash
npm run dev                 # start backend with hot reload
npm run build               # Prisma generate + TypeScript compilation
npm start                   # run compiled backend
npm run prisma:migrate      # create/apply migration in development
npm run prisma:deploy       # apply existing migrations
npm run prisma:seed         # populate sample data
npm run prisma:studio       # open Prisma Studio
```

---

## Environment Variables

### Frontend

| Variable              | Description     |
| --------------------- | --------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

### Backend

| Variable               | Description                            |
| ---------------------- | -------------------------------------- |
| `PORT`                 | Backend server port                    |
| `DATABASE_URL`         | PostgreSQL connection string           |
| `JWT_SECRET`           | Secret used to sign JWT session tokens |
| `CLIENT_ORIGIN`        | Frontend origin used for CORS          |
| `GEMINI_API_KEY`       | Enables AI features                    |
| `RESEND_API_KEY`       | Enables password-reset emails          |
| `EMAIL_FROM`           | Sender address for outgoing emails     |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret             |
| `GOOGLE_REDIRECT_URI`  | Google OAuth callback URL              |

Never commit `.env` or `.env.local` files.

---

## Project Structure

```text
LoopBoard/
│
├── src/
│   ├── app/
│   │   ├── analytics/
│   │   ├── dashboard/
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── projects/
│   │   │   └── [id]/
│   │   ├── register/
│   │   ├── reset-password/
│   │   ├── settings/
│   │   ├── tasks/
│   │   └── team/
│   │
│   ├── components/
│   │   └── dashboard/
│   │
│   ├── lib/
│   │   └── api/
│   │
│   └── types/
│
├── shared/
│   └── types.ts
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   │
│   └── src/
│
├── public/
├── package.json
└── README.md
```

---

## Data Ownership

LoopBoard uses authenticated-user ownership and authorization boundaries.

A newly registered user should see their own application state rather than another user's existing projects, tasks, or activity.

Project operations are scoped to the appropriate authenticated user.

Team membership also distinguishes between:

* The overall team roster
* Membership within an individual project

Removing a team member from a project therefore does not delete that person's account from the overall team roster.

---

## Team Member Management

Team members can be managed from the application.

### Edit

Editing a team member updates their account-level information and therefore affects the member wherever that information is displayed.

### Remove From Project

Removing a member from a project only changes that project's membership.

The member can remain:

* On the overall team roster
* Assigned to other projects
* Available for future project assignments

### Delete

Deleting a team member is an account-level destructive action and is separate from simply removing the member from a project.

---

## Project Deletion

Deleting a project requires confirmation.

The project's associated tasks are removed through the configured database cascade behavior.

---

## Task Comments

Tasks support comments through the backend comments API.

Comments contain author information and are associated with their corresponding task.

Comment deletion is restricted to the comment author.

---

## API Documentation

The backend contains the complete REST API documentation in:

```text
server/API_DOCUMENTATION.md
```

The API includes endpoints for:

* Authentication
* Users
* Projects
* Tasks
* Team members
* Task comments
* Activity
* Dashboard statistics
* AI features
* Notification preferences

---

## Application Routes

| Route              | Purpose              |
| ------------------ | -------------------- |
| `/`                | Root page            |
| `/login`           | User login           |
| `/register`        | Account registration |
| `/forgot-password` | Password recovery    |
| `/reset-password`  | Password reset       |
| `/dashboard`       | Main dashboard       |
| `/projects`        | Project management   |
| `/projects/[id]`   | Project details      |
| `/tasks`           | Task management      |
| `/team`            | Team management      |
| `/analytics`       | Analytics            |
| `/settings`        | Application settings |

---

## Deployment

LoopBoard uses a separate frontend/backend deployment architecture.

### Frontend

The Next.js application can be deployed to Vercel.

The frontend communicates with the deployed backend using the configured API URL.

### Backend

The Express backend can be deployed as a long-running Node.js service such as Render.

### Database

The application uses PostgreSQL through Prisma.

A managed PostgreSQL provider such as Neon can be used for production.

### Production Requirements

Make sure:

* `CLIENT_ORIGIN` exactly matches the deployed frontend origin
* `NODE_ENV=production` is configured
* JWT and database secrets are configured in the deployment platform
* Google OAuth redirect URLs match the production callback URL
* Pending Prisma migrations are applied during deployment

Apply existing migrations with:

```bash
npx prisma migrate deploy
```

---

## Verification

Before pushing changes, verify both applications.

### Frontend

From the project root:

```bash
npx tsc --noEmit
npx eslint
npm run build
```

The current frontend production build successfully completes TypeScript checking, page generation, and optimization.

### Backend

From `server`:

```bash
npx tsc --noEmit
npm run build
```

The current backend TypeScript check and production build complete successfully.

---

## License

MIT
