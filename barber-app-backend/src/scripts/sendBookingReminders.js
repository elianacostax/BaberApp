require("dotenv").config();

const { DateTime } = require("luxon");
const { Op } = require("sequelize");
const { connectDB, sequelize } = require("../config/db");
require("../models/index");

const Booking = require("../models/Booking");
const { notifyBookingEvent, buildDispatchKey, hasQueuedNotificationForDispatch } = require("../utils/bookingNotifications");
const { hasBookingHistoryEvent } = require("../utils/bookingHistory");
const { logger } = require("../utils/logger");

const APP_TIMEZONE = "America/Bogota";
const DEFAULT_WINDOWS_MINUTES = [1440, 120];
const DEFAULT_TOLERANCE_MINUTES = 15;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value === "true";
};

const parseReminderWindows = () => {
  const raw = process.env.BOOKING_REMINDER_WINDOWS_MINUTES;
  if (!raw) return DEFAULT_WINDOWS_MINUTES;

  const windows = raw
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => b - a);

  return windows.length ? windows : DEFAULT_WINDOWS_MINUTES;
};

const buildReminderEventType = (windowMinutes) => {
  if (windowMinutes === 1440) return "booking_reminder_24h";
  if (windowMinutes === 120) return "booking_reminder_2h";
  return `booking_reminder_${windowMinutes}m`;
};

const hasReminderBeenSent = (booking, reminderWindowMinutes) =>
  hasBookingHistoryEvent(
    booking,
    (entry) =>
      entry?.type === "notification_sent" &&
      entry?.eventType === "booking_reminder" &&
      Number(entry?.reminderWindowMinutes) === Number(reminderWindowMinutes)
  );

const getCandidateBookings = async (maxWindowMinutes, toleranceMinutes) => {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const maxStart = now.plus({ minutes: maxWindowMinutes + toleranceMinutes });

  return Booking.findAll({
    where: {
      status: { [Op.in]: ["pending", "confirmed"] },
      startTime: {
        [Op.gte]: now.toJSDate(),
        [Op.lte]: maxStart.toJSDate(),
      },
    },
    order: [["startTime", "ASC"]],
  });
};

const processReminderWindow = async ({ booking, reminderWindowMinutes, toleranceMinutes, dryRun }) => {
  if (hasReminderBeenSent(booking, reminderWindowMinutes)) {
    return { status: "skipped_already_sent" };
  }

  const start = DateTime.fromJSDate(new Date(booking.startTime), { zone: APP_TIMEZONE });
  if (!start.isValid) {
    return { status: "skipped_invalid_start" };
  }

  const minutesUntilStart = start.diff(DateTime.now().setZone(APP_TIMEZONE), "minutes").minutes;
  const lowerBound = reminderWindowMinutes - toleranceMinutes;
  const upperBound = reminderWindowMinutes + toleranceMinutes;

  if (minutesUntilStart < lowerBound || minutesUntilStart > upperBound) {
    return { status: "skipped_outside_window" };
  }

  const payload = {
    reminderWindowMinutes,
    reminderType: "booking_reminder",
  };
  const eventType = buildReminderEventType(reminderWindowMinutes);
  const dispatchKey = buildDispatchKey({
    bookingId: booking.id,
    eventType,
    payload,
  });

  if (await hasQueuedNotificationForDispatch(dispatchKey)) {
    return { status: "skipped_already_queued" };
  }

  if (dryRun) {
    return {
      status: "dry_run",
      eventType,
      minutesUntilStart: Math.round(minutesUntilStart),
    };
  }

  await notifyBookingEvent({
    bookingId: booking.id,
    eventType,
    payload,
  });

  return {
    status: "queued",
    eventType,
    minutesUntilStart: Math.round(minutesUntilStart),
  };
};

async function main() {
  const remindersEnabled = parseBoolean(process.env.BOOKING_REMINDERS_ENABLED, true);
  if (!remindersEnabled) {
    console.log("BOOKING_REMINDERS_ENABLED=false, no se enviaron recordatorios.");
    return;
  }

  const reminderWindows = parseReminderWindows();
  const toleranceMinutes = Number.parseInt(
    process.env.BOOKING_REMINDER_TOLERANCE_MINUTES || `${DEFAULT_TOLERANCE_MINUTES}`,
    10
  );
  const dryRun = parseBoolean(process.env.BOOKING_REMINDERS_DRY_RUN, false);

  await connectDB();

  const bookings = await getCandidateBookings(Math.max(...reminderWindows), toleranceMinutes);
  const summary = {
    scanned: bookings.length,
    queued: 0,
    dryRun: 0,
    skipped: 0,
    errors: 0,
  };

  for (const booking of bookings) {
    for (const reminderWindowMinutes of reminderWindows) {
      try {
        const result = await processReminderWindow({
          booking,
          reminderWindowMinutes,
          toleranceMinutes,
          dryRun,
        });

        if (result.status === "queued") summary.queued += 1;
        else if (result.status === "dry_run") summary.dryRun += 1;
        else summary.skipped += 1;
      } catch (error) {
        summary.errors += 1;
        logger.error("Booking reminder dispatch failed", {
          bookingId: booking.id,
          reminderWindowMinutes,
          error: error.message,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        message: "Booking reminders processed",
        ...summary,
        reminderWindows,
        toleranceMinutes,
        dryRun,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    logger.error("Booking reminders script failed", { error: error.message, stack: error.stack });
    console.error("Error enviando recordatorios:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // noop
    }
  });
