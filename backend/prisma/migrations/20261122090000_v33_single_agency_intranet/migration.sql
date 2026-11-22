-- v33: single-agency intranet. Drops Super Admin II / Super Gate Officer roles, in-app calls and demo-seed tracking.
-- Existing GLOBAL_ADMIN accounts become ADMIN, GLOBAL_GATE become GATE (fresh installs have none).

DROP TABLE IF EXISTS "RingCall" CASCADE;
DROP TABLE IF EXISTS "DemoSeedRecord" CASCADE;

UPDATE "User" SET "role" = 'ADMIN' WHERE "role"::text = 'GLOBAL_ADMIN';
UPDATE "User" SET "role" = 'GATE' WHERE "role"::text = 'GLOBAL_GATE';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'GATE');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';
DROP TYPE "Role_old";

-- Gate comment on the visit (Visiting card, column 2)
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "gateComment" TEXT;
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "gateCommentAt" TIMESTAMP(3);
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "gateCommentById" TEXT;
DO $$ BEGIN
  ALTER TABLE "Invite" ADD CONSTRAINT "Invite_gateCommentById_fkey" FOREIGN KEY ("gateCommentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
