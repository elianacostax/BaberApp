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
    barberId: {
      type: DataTypes.UUID,
      allowNull: false,
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
      { fields: ["barberId", "start", "end"] },
      { fields: ["appliesToAllBarbers", "start", "end"] },
      { fields: ["start", "end"] },
      { fields: ["createdById"] },
    ],
  }
);

module.exports = AvailabilityBlock;
