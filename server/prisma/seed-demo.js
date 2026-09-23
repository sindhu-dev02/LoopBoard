// Same demo data as seed.js, but never touches the User table, and assigns
// everything to one existing account instead of leaving it ownerless.
//
// Data is now scoped per-owner (see the ownerId migration), so unowned rows
// are invisible to everyone — this script picks a real account to own the
// demo data, so you (or a demo/admin account you register first) can log in
// and see a populated workspace, while every other new registrant still
// gets a genuinely clean, empty dashboard.
//
// Usage:
//   1. Register the account you want to own the demo data, if you haven't already.
//   2. SEED_OWNER_EMAIL=you@example.com node prisma/seed-demo.js
//
// Safe to re-run: only wipes data owned by that same account, never anyone else's.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  if (!ownerEmail) {
    console.error(
      "Set SEED_OWNER_EMAIL to the email of an existing registered account, e.g.\n" +
      "  SEED_OWNER_EMAIL=you@example.com node prisma/seed-demo.js"
    );
    process.exit(1);
  }

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    console.error(`No registered user found with email "${ownerEmail}". Register that account first.`);
    process.exit(1);
  }

  console.log(`Seeding demo data owned by ${owner.name} <${owner.email}>...`);

  // Wipe only this owner's existing demo data, in FK-safe order. Other
  // users' data, and this user's real (non-demo) rows if any, are untouched
  // as long as they were also created under this same account.
  await prisma.task.deleteMany({ where: { project: { ownerId: owner.id } } });
  await prisma.projectMember.deleteMany({ where: { project: { ownerId: owner.id } } });
  await prisma.project.deleteMany({ where: { ownerId: owner.id } });
  await prisma.teamMember.deleteMany({ where: { ownerId: owner.id } });

  const members = await Promise.all(
    [
      { name: "Sarah Patel", role: "Frontend Engineer", email: "sarah@xyz.com" },
      { name: "Alex Kim", role: "Product Designer", email: "alex@xyz.com" },
      { name: "Jo Chen", role: "Backend Engineer", email: "joe@xyz.com" },
      { name: "Max Lee", role: "Full-stack Engineer", email: "max@xyz.com" },
      { name: "Priya Rao", role: "Backend Engineer", email: "priya@xyz.com" },
    ].map((m) => prisma.teamMember.create({ data: { ...m, ownerId: owner.id } }))
  );
  const byName = Object.fromEntries(members.map((m) => [m.name, m]));

  const designSystem = await prisma.project.create({
    data: {
      name: "Design System v2",
      description: "Unify tokens and components across product surfaces.",
      status: "on-track",
      progress: 72,
      dueDate: new Date("2026-09-15T00:00:00.000Z"),
      ownerId: owner.id,
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
      ownerId: owner.id,
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
      ownerId: owner.id,
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
      ownerId: owner.id,
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

  console.log(`Demo seed complete, owned by ${owner.email}. Other accounts are unaffected.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });