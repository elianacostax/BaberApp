const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const AvailabilityBlock = sequelize.define(
  "AvailabilityBlock",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    barbershopId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Barbershops",
        key: "id",
      },
    },
    barberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      defaultValue: "manual",
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
    appliesToAllBarbers: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "AvailabilityBlocks",
    timestamps: true,
    indexes: [
      { name: "availability_blocks_barbershop_start_end_idx", fields: ["barbershopId", "start", "end"] },
      { name: "availability_blocks_barber_start_end_idx", fields: ["barberId", "start", "end"] },
      { name: "availability_blocks_shop_all_barbers_idx", fields: ["barbershopId", "appliesToAllBarbers", "start", "end"] },
      { name: "availability_blocks_start_end_idx", fields: ["start", "end"] },
      { name: "availability_blocks_created_by_idx", fields: ["createdById"] },
    ],
  }
);

module.exports = AvailabilityBlock;
