-- v32: gate entry points, RFID tags, paper requests (hosts without accounts), manual exit.
ALTER TYPE "GatePassProtocol" ADD VALUE IF NOT EXISTS 'RFID_TAGS';

ALTER TABLE "Gate" ADD COLUMN IF NOT EXISTS "groupName" TEXT;

ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "hostName" TEXT;
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "hostPhone" TEXT;
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "hostOffice" TEXT;

ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "exitManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "exitNote" TEXT;

ALTER TABLE "GatePassItem" ADD COLUMN IF NOT EXISTS "rfidUid" TEXT;
-- One card can only be out on one visit at a time; returned/lost cards are free again.
CREATE UNIQUE INDEX IF NOT EXISTS "GatePassItem_rfidUid_issued_key" ON "GatePassItem"("rfidUid") WHERE "status" = 'ISSUED' AND "rfidUid" IS NOT NULL;
