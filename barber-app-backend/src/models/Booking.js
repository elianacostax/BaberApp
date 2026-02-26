const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    barbershopId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Barbershops",
        key: "id",
      },
    },
    barberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      comment: "Opcional para walk-in",
    },
    serviceName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    servicePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    serviceDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Duración en minutos",
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Fecha en formato string",
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Hora en formato string",
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled", "completed"),
      defaultValue: "pending",
    },
    walkInClient: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: "Datos del cliente walk-in",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      comment: "Usuario que creó la reserva",
    },
    modifiedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      comment: "Usuario que modificó la reserva",
    },
  },
  {
    tableName: "Bookings",
    timestamps: true,
    indexes: [
      { fields: ["barberId", "date"] },
      { fields: ["userId", "date"] },
      { fields: ["barbershopId", "date"] },
      { fields: ["startTime", "endTime"] },
      { fields: ["status", "date"] },
      { fields: ["createdAt"], order: "DESC" },
    ],
  }
);

module.exports = Booking;
