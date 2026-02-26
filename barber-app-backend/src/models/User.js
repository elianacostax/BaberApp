const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { 
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [2, 50],
      },
    },
    email: { 
      type: DataTypes.STRING,
      allowNull: false,
        unique: true,
        validate: {
        isEmail: true,
            },
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        isValidPhone(value) {
          if (value && value.trim() !== '') {
            if (!/^[+]?[0-9\s\-\(\)]{7,15}$/.test(value)) {
              throw new Error('Debe proporcionar un número de teléfono válido');
            }
          }
        }
      },
    },
    password: { 
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [6, 128],
      },
    },
    role: {
      type: DataTypes.ENUM("client", "barber", "admin", "owner"),
      defaultValue: "client",
    },
    schedule: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Horario personalizado por día",
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
      validate: {
        isValidPhoto(value) {
          if (value && value.trim() !== '') {
            if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value)) {
              throw new Error('La foto debe ser una URL válida de imagen');
            }
          }
        }
      },
    },
    bio: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: "",
    },
    customServices: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Servicios personalizados del barbero",
    },
    customPrices: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Precios personalizados para servicios de la barbería",
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: { favoriteBarbers: [], favoriteBarbershops: [] },
      comment: "Preferencias del cliente (favoritos, etc.)",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    barbershopId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Barbershops",
        key: "id",
      },
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "Users",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
    const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
    indexes: [
      { fields: ["email"], unique: true },
      { fields: ["role"] },
      { fields: ["barbershopId"] },
    ],
  }
);

// Método para verificar contraseña
User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
