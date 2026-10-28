-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'DISPUTED', 'FINAL');

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" "EvaluationStatus" NOT NULL DEFAULT 'FINAL';

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "solveId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "solutionScore" INTEGER,
    "aiEfficiency" INTEGER NOT NULL,
    "aiLearning" INTEGER NOT NULL,
    "aiTransparency" INTEGER NOT NULL,
    "aiInnovation" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_solveId_reviewerId_key" ON "Review"("solveId", "reviewerId");

-- CreateIndex
CREATE INDEX "Evaluation_status_idx" ON "Evaluation"("status");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_solveId_fkey" FOREIGN KEY ("solveId") REFERENCES "Solve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing evaluation becomes its reviewer's individual review.
INSERT INTO "Review" ("id", "solveId", "reviewerId", "solutionScore", "aiEfficiency", "aiLearning", "aiTransparency", "aiInnovation", "notes", "createdAt", "updatedAt")
SELECT 'rv_' || e."id", e."solveId", e."reviewerId", e."solutionScore", e."aiEfficiency", e."aiLearning", e."aiTransparency", e."aiInnovation", COALESCE(e."notes", ''), e."createdAt", e."updatedAt"
FROM "Evaluation" e;
