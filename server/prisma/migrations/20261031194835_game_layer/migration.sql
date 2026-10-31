-- AlterTable
ALTER TABLE "User" ADD COLUMN     "progressSeen" JSONB;

-- CreateTable
CREATE TABLE "Achievement" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "date" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "DailyChallenge_problemId_idx" ON "DailyChallenge"("problemId");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
