const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
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
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: "Bookings",
        key: "id",
      },
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "Reviews",
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["barberId"] },
      { fields: ["bookingId"], unique: true },
    ],
  }
);

module.exports = Review;
