const crypto = require("crypto");
const { DateTime } = require("luxon");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Barbershop = require("../models/Barbershop");
const NotificationJob = require("../models/NotificationJob");
const { sequelize } = require("../config/db");
const { logger } = require("./logger");
const { sendBookingNotificationEmail, isMailConfigured } = require("./mailer");
const { sendWhatsAppMessage, isWhatsAppConfigured, normalizePhone } = require("./whatsapp");
const { appendBookingHistory } = require("./bookingHistory");

const APP_TIMEZONE = "America/Bogota";
const DEFAULT_MAX_ATTEMPTS = Number(process.env.NOTIFICATION_QUEUE_MAX_ATTEMPTS || 3);
const DEFAULT_BATCH_SIZE = Number(process.env.NOTIFICATION_QUEUE_BATCH_SIZE || 25);
const DEFAULT_LOCK_MINUTES = Number(process.env.NOTIFICATION_QUEUE_LOCK_MINUTES || 5);
const DEFAULT_RETRY_DELAY_SECONDS = Number(process.env.NOTIFICATION_QUEUE_RETRY_DELAY_SECONDS || 60);

const BOOKINGS_NOTIFICATION_RELATIONS = [
  {
    model: User,
    as: "user",
    attributes: ["id", "name", "email", "phone"],
  },
  {
    model: User,
    as: "barber",
    attributes: ["id", "name", "email", "phone"],
  },
  {
    model: Barbershop,
    as: "barbershop",
    attributes: ["id", "name", "address", "location", "phone", "ownerId"],
    include: [
      {
        model: User,
        as: "owner",
        attributes: ["id", "name", "email", "phone"],
      },
    ],
  },
];

const isEnabled = (name, defaultValue = true) => {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw === "true";
};

const formatDateTime = (booking) => {
  const dt = DateTime.fromJSDate(new Date(booking.startTime), { zone: APP_TIMEZONE });
  if (!dt.isValid) return `${booking.date} ${booking.time}`;
  return dt.setZone(APP_TIMEZONE).toFormat("dd 'de' LLLL yyyy, hh:mm a");
};

const buildEventLabel = (eventType) => {
  if (eventType.startsWith("booking_reminder_")) {
    return "Recordatorio de cita";
  }

  switch (eventType) {
    case "booking_created":
      return "Reserva confirmada";
    case "booking_repeated":
      return "Reserva repetida";
    case "booking_status_changed":
      return "Reserva actualizada";
    case "booking_cancelled":
      return "Reserva cancelada";
    case "booking_barber_changed":
      return "Reserva reasignada";
    case "booking_walk_in_created":
      return "Reserva walk-in creada";
    default:
      return "Reserva actualizada";
  }
};

const buildEventDescription = (eventType, payload = {}) => {
  if (eventType.startsWith("booking_reminder_")) {
    const reminderWindowMinutes = Number(payload.reminderWindowMinutes || 0);
    if (reminderWindowMinutes >= 60) {
      const hours = Math.round(reminderWindowMinutes / 60);
      return `Te recordamos que tu cita está programada dentro de aproximadamente ${hours} hora${hours === 1 ? "" : "s"}.`;
    }
    if (reminderWindowMinutes > 0) {
      return `Te recordamos que tu cita está programada dentro de aproximadamente ${reminderWindowMinutes} minutos.`;
    }
    return "Te recordamos que tu cita está próxima.";
  }

  switch (eventType) {
    case "booking_created":
      return "Tu cita fue registrada y confirmada.";
    case "booking_repeated":
      return "Se creó una nueva cita a partir de una reserva anterior.";
    case "booking_status_changed":
      return payload.newStatus
        ? `El estado de la reserva cambió a ${payload.newStatus}.`
        : "La reserva fue actualizada.";
    case "booking_cancelled":
      return "La reserva fue cancelada.";
    case "booking_barber_changed":
      return "La reserva fue reasignada a otro barbero.";
    case "booking_walk_in_created":
      return "Se registró una reserva presencial en agenda.";
    default:
      return "Hubo un cambio en la reserva.";
  }
};

const buildBookingSummary = (booking) => {
  const client = booking.user || booking.walkInClient || null;
  return [
    `Barbería: ${booking.barbershop?.name || "N/D"}`,
    `Dirección: ${booking.barbershop?.address || booking.barbershop?.location || "N/D"}`,
    `Barbero: ${booking.barber?.name || "N/D"}`,
    `Cliente: ${client?.name || "N/D"}`,
    `Servicio: ${booking.serviceName}`,
    `Fecha y hora: ${formatDateTime(booking)}`,
    `Duración: ${booking.serviceDuration} min`,
    `Valor: ${booking.servicePrice}`,
    `Estado: ${booking.status}`,
  ];
};

const buildRecipients = (booking) => {
  const recipients = [];
  const client = booking.user || booking.walkInClient || null;
  const clientEmail = client?.email && !String(client.email).endsWith("@walkin.com") ? client.email : null;
  const clientPhone = normalizePhone(client?.phone || null);
  const barberPhone = normalizePhone(booking.barber?.phone || null);
  const shopPhone = normalizePhone(booking.barbershop?.phone || booking.barbershop?.owner?.phone || null);

  recipients.push({
    kind: "client",
    name: client?.name || "Cliente",
    email: clientEmail,
    phone: clientPhone,
  });

  recipients.push({
    kind: "barber",
    name: booking.barber?.name || "Barbero",
    email: booking.barber?.email || null,
    phone: barberPhone,
  });

  recipients.push({
    kind: "barbershop",
    name: booking.barbershop?.name || "Barbería",
    email: booking.barbershop?.owner?.email || null,
    phone: shopPhone,
  });

  return recipients;
};

const buildEmailBody = ({ booking, eventLabel, eventDescription, recipient }) => {
  const summary = buildBookingSummary(booking);
  const lines = summary.map((line) => `<li>${line}</li>`).join("");
  return {
    subject: `${eventLabel} - ${booking.barbershop?.name || "BarberApp"}`,
    html: `
      <p>Hola ${recipient.name},</p>
      <p>${eventDescription}</p>
      <ul>${lines}</ul>
      <p>Reserva ID: ${booking.id}</p>
    `,
    text: [`Hola ${recipient.name}`, eventDescription, ...summary, `Reserva ID: ${booking.id}`].join("\n"),
  };
};

const buildWhatsAppBody = ({ booking, eventLabel, eventDescription, recipient }) => {
  const summary = buildBookingSummary(booking);
  return [`Hola ${recipient.name}`, eventLabel, eventDescription, ...summary, `Reserva ID: ${booking.id}`].join("\n");
};

const buildDispatchKey = ({ bookingId, eventType, payload = {} }) => {
  const stablePayload = JSON.stringify(payload, Object.keys(payload).sort());
  const hash = crypto.createHash("sha1").update(`${bookingId}:${eventType}:${stablePayload}`).digest("hex");
  return `${bookingId}:${eventType}:${hash}`.slice(0, 255);
};

const buildNotificationJobs = ({ booking, eventType, payload = {} }) => {
  const eventLabel = buildEventLabel(eventType);
  const eventDescription = buildEventDescription(eventType, payload);
  const recipients = buildRecipients(booking);
  const dispatchKey = buildDispatchKey({ bookingId: booking.id, eventType, payload });
  const jobs = [];

  for (const recipient of recipients) {
    if (isEnabled("BOOKING_EMAIL_NOTIFICATIONS_ENABLED", true) && isMailConfigured() && recipient.email) {
      const email = buildEmailBody({ booking, eventLabel, eventDescription, recipient });
      jobs.push({
        bookingId: booking.id,
        barbershopId: booking.barbershopId,
        dispatchKey,
        eventType,
        channel: "email",
        recipientKind: recipient.kind,
        recipientName: recipient.name,
        destination: recipient.email,
        status: "pending",
        attempts: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
        payload: {
          bookingId: booking.id,
          recipient,
          email,
          metadata: {
            eventType,
            barbershopId: booking.barbershopId,
            reminderWindowMinutes: payload.reminderWindowMinutes || null,
          },
        },
      });
    }

    if (isEnabled("BOOKING_WHATSAPP_NOTIFICATIONS_ENABLED", true) && isWhatsAppConfigured() && recipient.phone) {
      const message = buildWhatsAppBody({ booking, eventLabel, eventDescription, recipient });
      jobs.push({
        bookingId: booking.id,
        barbershopId: booking.barbershopId,
        dispatchKey,
        eventType,
        channel: "whatsapp",
        recipientKind: recipient.kind,
        recipientName: recipient.name,
        destination: recipient.phone,
        status: "pending",
        attempts: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
        payload: {
          bookingId: booking.id,
          recipient,
          whatsapp: {
            message,
          },
          metadata: {
            eventType,
            barbershopId: booking.barbershopId,
            reminderWindowMinutes: payload.reminderWindowMinutes || null,
          },
        },
      });
    }
  }

  return jobs;
};

const calculateNextAttemptAt = (attemptNumber) => {
  const exponent = Math.max(0, attemptNumber - 1);
  const delaySeconds = DEFAULT_RETRY_DELAY_SECONDS * (2 ** exponent);
  return new Date(Date.now() + delaySeconds * 1000);
};

const recordJobHistory = async (job, success, errorMessage = null) => {
  if (!job.bookingId) return;

  const booking = await Booking.findByPk(job.bookingId);
  if (!booking) return;

  appendBookingHistory(booking, {
    type: success ? "notification_sent" : "notification_failed",
    eventType: job.eventType.startsWith("booking_reminder_") ? "booking_reminder" : job.eventType,
    channel: job.channel,
    recipientKind: job.recipientKind,
    reminderWindowMinutes: job.payload?.metadata?.reminderWindowMinutes || null,
    error: errorMessage || undefined,
  });

  await booking.save({ fields: ["notes"] });
};

const sendNotificationJob = async (job) => {
  if (job.channel === "email") {
    return sendBookingNotificationEmail({
      to: job.destination,
      subject: job.payload?.email?.subject,
      html: job.payload?.email?.html,
      text: job.payload?.email?.text,
    });
  }

  if (job.channel === "whatsapp") {
    return sendWhatsAppMessage({
      to: job.destination,
      message: job.payload?.whatsapp?.message,
      metadata: {
        ...(job.payload?.metadata || {}),
        recipient: job.recipientKind,
        bookingId: job.bookingId,
      },
    });
  }

  return null;
};

async function notifyBookingEvent({ bookingId, eventType, payload = {} }) {
  if (!isEnabled("BOOKING_NOTIFICATIONS_ENABLED", true)) {
    return { enqueued: 0 };
  }

  const booking = await Booking.findByPk(bookingId, {
    include: BOOKINGS_NOTIFICATION_RELATIONS,
  });

  if (!booking) {
    logger.warn("Booking notification skipped: booking not found", { bookingId, eventType });
    return { enqueued: 0 };
  }

  const jobs = buildNotificationJobs({
    booking: booking.get({ plain: true }),
    eventType,
    payload,
  });

  if (!jobs.length) {
    logger.info("Booking notification skipped: no eligible channels", { bookingId, eventType });
    return { enqueued: 0 };
  }

  await NotificationJob.bulkCreate(jobs, {
    ignoreDuplicates: true,
  });

  return { enqueued: jobs.length };
}

const claimPendingNotificationJobs = async ({ limit = DEFAULT_BATCH_SIZE, workerId }) => {
  const now = new Date();
  const staleBefore = new Date(Date.now() - DEFAULT_LOCK_MINUTES * 60 * 1000);

  const [rows] = await sequelize.query(
    `
      UPDATE "NotificationJobs"
      SET "lockedAt" = :now, "lockedBy" = :workerId, "updatedAt" = :now
      WHERE "id" IN (
        SELECT "id"
        FROM "NotificationJobs"
        WHERE "status" = 'pending'
          AND "nextAttemptAt" <= :now
          AND ("lockedAt" IS NULL OR "lockedAt" <= :staleBefore)
        ORDER BY "createdAt" ASC
        LIMIT :limit
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `,
    {
      replacements: {
        now,
        staleBefore,
        limit,
        workerId,
      },
      model: NotificationJob,
      mapToModel: true,
    }
  );

  return rows || [];
};

async function processPendingNotificationJobs({ limit = DEFAULT_BATCH_SIZE, workerId = `worker-${process.pid}` } = {}) {
  const claimedJobs = await claimPendingNotificationJobs({ limit, workerId });
  const summary = { claimed: claimedJobs.length, sent: 0, failed: 0, rescheduled: 0 };

  for (const job of claimedJobs) {
    const attemptNumber = Number(job.attempts || 0) + 1;

    try {
      const providerMessageId = await sendNotificationJob(job);

      await job.update({
        status: "sent",
        attempts: attemptNumber,
        lastAttemptAt: new Date(),
        sentAt: new Date(),
        providerMessageId: providerMessageId || null,
        lastError: null,
        lockedAt: null,
        lockedBy: null,
      });

      await recordJobHistory(job, true);
      summary.sent += 1;
    } catch (error) {
      const terminal = attemptNumber >= Number(job.maxAttempts || DEFAULT_MAX_ATTEMPTS);
      await job.update({
        status: terminal ? "failed" : "pending",
        attempts: attemptNumber,
        lastAttemptAt: new Date(),
        lastError: error.message,
        nextAttemptAt: terminal ? job.nextAttemptAt : calculateNextAttemptAt(attemptNumber),
        lockedAt: null,
        lockedBy: null,
      });

      await recordJobHistory(job, false, error.message);

      if (terminal) summary.failed += 1;
      else summary.rescheduled += 1;

      logger.error("Notification job failed", {
        jobId: job.id,
        bookingId: job.bookingId,
        eventType: job.eventType,
        channel: job.channel,
        recipientKind: job.recipientKind,
        attempts: attemptNumber,
        terminal,
        error: error.message,
      });
    }
  }

  return summary;
}

async function hasQueuedNotificationForDispatch(dispatchKey) {
  const count = await NotificationJob.count({
    where: {
      dispatchKey,
    },
  });

  return count > 0;
}

module.exports = {
  notifyBookingEvent,
  processPendingNotificationJobs,
  buildDispatchKey,
  hasQueuedNotificationForDispatch,
};
