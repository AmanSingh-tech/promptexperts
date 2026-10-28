-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProblemType" AS ENUM ('CODE', 'WRITTEN');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ALGORITHMS', 'DATA_STRUCTURES', 'SYSTEM_DESIGN', 'WEB_DEV', 'DEBUGGING', 'OTHER');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "LogRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('PLATFORM', 'IMPORTED');

-- CreateEnum
CREATE TYPE "SolveStatus" AS ENUM ('ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT', 'MANUAL_REVIEW', 'JUDGE_ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "category" "Category" NOT NULL DEFAULT 'ALGORITHMS',
    "type" "ProblemType" NOT NULL DEFAULT 'CODE',
    "constraints" TEXT,
    "starterCode" JSONB,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTag" (
    "problemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProblemTag_pkey" PRIMARY KEY ("problemId","tagId")
);

-- CreateTable
CREATE TABLE "AISession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AILog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "LogRole" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "LogSource" NOT NULL DEFAULT 'PLATFORM',
    "tool" TEXT,
    "tokensUsed" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AILog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solve" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "aiSessionId" TEXT,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SolveStatus" NOT NULL,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "autoScore" INTEGER,
    "results" JSONB,
    "autoReview" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Solve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "solveId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "solutionScore" INTEGER NOT NULL,
    "aiEfficiency" INTEGER NOT NULL,
    "aiLearning" INTEGER NOT NULL,
    "aiTransparency" INTEGER NOT NULL,
    "aiInnovation" INTEGER NOT NULL,
    "aiUsageScore" INTEGER NOT NULL,
    "finalScore" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE INDEX "TestCase_problemId_idx" ON "TestCase"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "AISession_userId_problemId_status_idx" ON "AISession"("userId", "problemId", "status");

-- CreateIndex
CREATE INDEX "AILog_sessionId_timestamp_idx" ON "AILog"("sessionId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Solve_aiSessionId_key" ON "Solve"("aiSessionId");

-- CreateIndex
CREATE INDEX "Solve_userId_idx" ON "Solve"("userId");

-- CreateIndex
CREATE INDEX "Solve_problemId_idx" ON "Solve"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_solveId_key" ON "Evaluation"("solveId");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISession" ADD CONSTRAINT "AISession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISession" ADD CONSTRAINT "AISession_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AISession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solve" ADD CONSTRAINT "Solve_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solve" ADD CONSTRAINT "Solve_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solve" ADD CONSTRAINT "Solve_aiSessionId_fkey" FOREIGN KEY ("aiSessionId") REFERENCES "AISession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_solveId_fkey" FOREIGN KEY ("solveId") REFERENCES "Solve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
