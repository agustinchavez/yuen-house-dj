-- CreateTable
CREATE TABLE "dj_allowlist" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedByEmail" TEXT NOT NULL,
    "firstLoginAt" DATETIME,
    "lastLoginAt" DATETIME,
    "showCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "shows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "djEmail" TEXT NOT NULL,
    "djName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "showType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "scheduledStart" DATETIME NOT NULL,
    "scheduledEnd" DATETIME NOT NULL,
    "audioFilePath" TEXT,
    "audioDurationSec" INTEGER,
    "liquidsoapRequestId" TEXT,
    "adminNote" TEXT,
    "approvedByEmail" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shows_djEmail_fkey" FOREIGN KEY ("djEmail") REFERENCES "dj_allowlist" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);
