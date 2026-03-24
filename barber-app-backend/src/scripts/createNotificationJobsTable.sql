CREATE TABLE IF NOT EXISTS "NotificationJobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NULL REFERENCES "Bookings"("id") ON DELETE SET NULL,
  "barbershopId" UUID NULL REFERENCES "Barbershops"("id") ON DELETE SET NULL,
  "dispatchKey" VARCHAR(255) NOT NULL,
  "eventType" VARCHAR(120) NOT NULL,
  "channel" VARCHAR(20) NOT NULL CHECK ("channel" IN ('email', 'whatsapp')),
  "recipientKind" VARCHAR(20) NOT NULL CHECK ("recipientKind" IN ('client', 'barber', 'barbershop')),
  "recipientName" VARCHAR(120) NULL,
  "destination" VARCHAR(255) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'sent', 'failed')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastAttemptAt" TIMESTAMPTZ NULL,
  "sentAt" TIMESTAMPTZ NULL,
  "providerMessageId" VARCHAR(255) NULL,
  "lastError" TEXT NULL,
  "lockedAt" TIMESTAMPTZ NULL,
  "lockedBy" VARCHAR(120) NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "notification_jobs_status_next_attempt_idx"
  ON "NotificationJobs" ("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "notification_jobs_booking_event_idx"
  ON "NotificationJobs" ("bookingId", "eventType");

CREATE INDEX IF NOT EXISTS "notification_jobs_dispatch_key_idx"
  ON "NotificationJobs" ("dispatchKey");

CREATE INDEX IF NOT EXISTS "notification_jobs_locked_at_idx"
  ON "NotificationJobs" ("lockedAt");

CREATE INDEX IF NOT EXISTS "notification_jobs_barbershop_idx"
  ON "NotificationJobs" ("barbershopId");

CREATE UNIQUE INDEX IF NOT EXISTS "notification_jobs_dedupe_idx"
  ON "NotificationJobs" ("dispatchKey", "channel", "recipientKind", "destination");
