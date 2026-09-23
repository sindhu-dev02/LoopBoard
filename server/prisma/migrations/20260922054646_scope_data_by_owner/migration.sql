/*
  Warnings:

  - You are about to drop the `comments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ownerId,email]` on the table `team_members` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_taskId_fkey";

-- DropIndex
DROP INDEX "team_members_email_key";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "ownerId" TEXT;

-- DropTable
DROP TABLE "comments";

-- CreateIndex
CREATE INDEX "activities_ownerId_idx" ON "activities"("ownerId");

-- CreateIndex
CREATE INDEX "projects_ownerId_idx" ON "projects"("ownerId");

-- CreateIndex
CREATE INDEX "team_members_ownerId_idx" ON "team_members"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_ownerId_email_key" ON "team_members"("ownerId", "email");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
