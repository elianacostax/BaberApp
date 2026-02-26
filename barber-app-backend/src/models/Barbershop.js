const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Barbershop = sequelize.define(
  "Barbershop",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
                name: { 
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Ciudad o zona",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    services: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Array de servicios de la barbería",
    },
    openingHours: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        openHour: 9,
        closeHour: 18,
      },
      validate: {
        isValidHours(value) {
          if (value.openHour >= value.closeHour) {
            throw new Error(
              "La hora de apertura debe ser menor que la de cierre"
            );
          }
          if (
            value.openHour < 0 ||
            value.openHour > 23 ||
            value.closeHour < 1 ||
            value.closeHour > 23
          ) {
            throw new Error("Las horas deben estar entre 0 y 23");
          }
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      comment: "URLs de imágenes de la barbería",
    },
  },
  {
    tableName: "Barbershops",
    timestamps: true,
    indexes: [
      { fields: ["ownerId"] },
      { fields: ["isActive"] },
      // Índice de texto simple (sin pg_trgm por ahora)
      { fields: ["name"] },
      { fields: ["address"] },
    ],
  }
);

module.exports = Barbershop;
