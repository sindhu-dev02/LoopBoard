// Same demo data as seed.js, but never touches the User table — safe to run
// against a database that already has real registered accounts on it.
// Run with: node prisma/seed-demo.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data (team/projects/tasks only — users untouched)...");

  // Wipe only the demo-data tables, in FK-safe order. Real user accounts,
  // their comments, and their password reset tokens are never touched.
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();

  const members = await Promise.all(
    [
      { name: "Sarah Patel", role: "Frontend Engineer", email: "sarah@xyz.com" },
      { name: "Alex Kim", role: "Product Designer", email: "alex@xyz.com" },
      { name: "Jo Chen", role: "Backend Engineer", email: "joe@xyz.com" },
      { name: "Max Lee", role: "Full-stack Engineer", email: "max@xyz.com" },
      { name: "Priya Rao", role: "Backend Engineer", email: "priya@xyz.com" },
    ].map((m) => prisma.teamMember.create({ data: m }))
  );
  const byName = Object.fromEntries(members.map((m) => [m.name, m]));

  const designSystem = await prisma.project.create({
    data: {
      name: "Design System v2",
      description: "Unify tokens and components across product surfaces.",
      status: "on-track",
      progress: 72,
      dueDate: new Date("2026-09-15T00:00:00.000Z"),
      memberLinks: {
        create: ["Sarah Patel", "Alex Kim", "Jo Chen"].map((name) => ({
          teamMember: { connect: { id: byName[name].id } },
        })),
      },
    },
  });

  const apiGateway = await prisma.project.create({
    data: {
      name: "API Gateway Migration",
      description: "Move legacy REST endpoints to the new gateway.",
      status: "at-risk",
      progress: 41,
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      memberLinks: {
        create: ["Max Lee", "Priya Rao"].map((name) => ({
          teamMember: { connect: { id: byName[name].id } },
        })),
      },
    },
  });

  const mobileOnboarding = await prisma.project.create({
    data: {
      name: "Mobile Onboarding Revamp",
      description: "Redesign first-run experience for iOS and Android.",
      status: "delayed",
      progress: 25,
      dueDate: new Date("2026-08-30T00:00:00.000Z"),
      memberLinks: {
        create: ["Jo Chen", "Sarah Patel", "Max Lee", "Priya Rao"].map(
          (name) => ({ teamMember: { connect: { id: byName[name].id } } })
        ),
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Analytics Pipeline",
      description: "Event tracking and dashboarding for product usage.",
      status: "completed",
      progress: 100,
      dueDate: new Date("2026-08-10T00:00:00.000Z"),
      memberLinks: {
        create: ["Alex Kim"].map((name) => ({
          teamMember: { connect: { id: byName[name].id } },
        })),
      },
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Finalize color token naming",
        status: "in-progress",
        priority: "high",
        projectId: designSystem.id,
        assigneeId: byName["Sarah Patel"].id,
        dueDate: new Date("2026-08-25T00:00:00.000Z"),
      },
      {
        title: "Audit legacy auth endpoints",
        status: "todo",
        priority: "high",
        projectId: apiGateway.id,
        assigneeId: byName["Max Lee"].id,
        dueDate: new Date("2026-08-24T00:00:00.000Z"),
      },
      {
        title: "Write onboarding copy v2",
        status: "review",
        priority: "medium",
        projectId: mobileOnboarding.id,
        assigneeId: byName["Jo Chen"].id,
        dueDate: new Date("2026-08-27T00:00:00.000Z"),
      },
      {
        title: "Set up rate limiting",
        status: "todo",
        priority: "high",
        projectId: apiGateway.id,
        assigneeId: byName["Priya Rao"].id,
        dueDate: new Date("2026-08-26T00:00:00.000Z"),
      },
      {
        title: "Component docs pass",
        status: "done",
        priority: "low",
        projectId: designSystem.id,
        assigneeId: byName["Alex Kim"].id,
        dueDate: new Date("2026-08-20T00:00:00.000Z"),
      },
      {
        title: "Prototype swipe gestures",
        status: "in-progress",
        priority: "medium",
        projectId: mobileOnboarding.id,
        assigneeId: byName["Sarah Patel"].id,
        dueDate: new Date("2026-08-29T00:00:00.000Z"),
      },
    ],
  });

  console.log("Demo seed complete. User accounts were not touched.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });