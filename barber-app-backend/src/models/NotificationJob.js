const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const NotificationJob = sequelize.define(
  "NotificationJob",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Bookings",
        key: "id",
      },
    },
    barbershopId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Barbershops",
        key: "id",
      },
    },
    dispatchKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    eventType: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("email", "whatsapp"),
      allowNull: false,
    },
    recipientKind: {
      type: DataTypes.ENUM("client", "barber", "barbershop"),
      allowNull: false,
    },
    recipientName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    destination: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    nextAttemptAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    providerMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lockedBy: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "NotificationJobs",
    timestamps: true,
    indexes: [
      { name: "notification_jobs_status_next_attempt_idx", fields: ["status", "nextAttemptAt"] },
      { name: "notification_jobs_booking_event_idx", fields: ["bookingId", "eventType"] },
      { name: "notification_jobs_dispatch_key_idx", fields: ["dispatchKey"] },
      { name: "notification_jobs_dedupe_idx", unique: true, fields: ["dispatchKey", "channel", "recipientKind", "destination"] },
      { name: "notification_jobs_locked_at_idx", fields: ["lockedAt"] },
      { name: "notification_jobs_barbershop_idx", fields: ["barbershopId"] },
    ],
  }
);

module.exports = NotificationJob;
