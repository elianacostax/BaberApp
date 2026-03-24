ALTER TABLE "AvailabilityBlocks"
ADD COLUMN IF NOT EXISTS "barbershopId" UUID REFERENCES "Barbershops"("id");

ALTER TABLE "AvailabilityBlocks"
ALTER COLUMN "barberId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "availability_blocks_barbershop_start_end_idx"
ON "AvailabilityBlocks" ("barbershopId", "start", "end");

CREATE INDEX IF NOT EXISTS "availability_blocks_shop_all_barbers_idx"
ON "AvailabilityBlocks" ("barbershopId", "appliesToAllBarbers", "start", "end");

UPDATE "AvailabilityBlocks" AS ab
SET "barbershopId" = u."barbershopId"
FROM "Users" AS u
WHERE ab."barberId" = u."id"
  AND ab."barbershopId" IS NULL;

UPDATE "AvailabilityBlocks" AS ab
SET "barbershopId" = bs."id"
FROM "Barbershops" AS bs
WHERE ab."createdById" = bs."ownerId"
  AND ab."appliesToAllBarbers" = TRUE
  AND ab."barbershopId" IS NULL;
