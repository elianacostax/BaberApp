
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

//Modelo y estructura de un usuario en la BD
const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'],
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [50, 'El nombre no puede tener más de 50 caracteres'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'El email es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Debe proporcionar un email válido'
        }
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        maxlength: [128, 'La contraseña no puede tener más de 128 caracteres']
    },
    role: {
        type: String,
        enum: {
            values: ["client", "barber", "admin"],
            message: 'El rol debe ser client, barber o admin'
        },
        default: "client",
    },
    schedule: {
        type: Map, // ejemplo de horario personalizado por día
        of: {
            start: {
                type: String,
                validate: {
                    validator: function(v) {
                        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                    },
                    message: 'El horario de inicio debe estar en formato HH:MM'
                }
            },
            end: {
                type: String,
                validate: {
                    validator: function(v) {
                        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                    },
                    message: 'El horario de fin debe estar en formato HH:MM'
                }
            }
        },
        default: {}, // Por defecto vacío
    },
    photo: {
        type: String, // URL a la imagen del barbero
        default: "",
        validate: {
            validator: function(v) {
                if (!v) return true; // Permitir vacío
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'La foto debe ser una URL válida de imagen'
        }
    },
    bio: {
        type: String, // Descripción del barbero
        default: "",
        maxlength: [500, 'La biografía no puede tener más de 500 caracteres']
    },
    // Servicios personalizados del barbero (adicionales a los de la barbería)
    customServices: [
        {
            name: {
                type: String,
                required: [true, 'El nombre del servicio es obligatorio'],
                minlength: [2, 'El nombre del servicio debe tener al menos 2 caracteres'],
                maxlength: [50, 'El nombre del servicio no puede tener más de 50 caracteres']
            },
            description: {
                type: String,
                maxlength: [200, 'La descripción no puede tener más de 200 caracteres'],
                default: ''
            },
            price: {
                type: Number,
                required: [true, 'El precio del servicio es obligatorio'],
                min: [0, 'El precio no puede ser negativo']
            },
            duration: {
                type: Number,
                required: [true, 'La duración del servicio es obligatoria'],
                min: [15, 'La duración mínima es 15 minutos']
            },
            isActive: {
                type: Boolean,
                default: true
            },
            category: {
                type: String,
                enum: ['haircut', 'beard', 'styling', 'treatment', 'other'],
                default: 'other'
            }
        },
    ],
    
    // Precios personalizados para servicios de la barbería
    customPrices: {
        type: Map,
        of: {
            price: {
                type: Number,
                min: [0, 'El precio no puede ser negativo']
            },
            isActive: {
                type: Boolean,
                default: true
            }
        },
        default: new Map()
    },
    barbershop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Barbershop",
        validate: {
            validator: function(v) {
                return !v || mongoose.Types.ObjectId.isValid(v);
            },
            message: 'ID de barbería inválido'
        }
    },
}, { timestamps: true });

// Campos para recuperación de contraseña
userSchema.add({
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
});

// Índices para optimización de consultas
// userSchema.index({ email: 1 }); // Índice único ya existe por unique: true
userSchema.index({ role: 1 }); // Para consultas por rol
userSchema.index({ barbershop: 1 }); // Para consultas por barbería

// Encriptar contraseña antes de guardar
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Verificar contraseña
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};



module.exports = mongoose.model("User", userSchema);
