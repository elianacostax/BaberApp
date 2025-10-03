
const mongoose = require("mongoose");





const bookingSchema = new mongoose.Schema({
    barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
    barber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    serviceName: { type: String, required: true },
    servicePrice: { type: Number, required: true },
    serviceDuration: { type: Number, required: true },

    date: { type: String, required: true },
    time: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "completed"],
        default: "pending"
    },

        // Campos para auditoría
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false // Solo se llena cuando la crea un barbero/admin
    },
    modifiedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false // Solo se llena cuando se modifica
    },

}, { timestamps: true });

// Índices para optimización de consultas
bookingSchema.index({ barber: 1, date: 1 }); // Para consultas por barbero y fecha
bookingSchema.index({ user: 1, date: 1 }); // Para consultas por usuario y fecha
bookingSchema.index({ barbershop: 1, date: 1 }); // Para consultas por barbería y fecha
bookingSchema.index({ startTime: 1, endTime: 1 }); // Para consultas de solapamiento
bookingSchema.index({ status: 1, date: 1 }); // Para consultas por estado y fecha
bookingSchema.index({ createdAt: -1 }); // Para ordenamiento por fecha de creación

module.exports = mongoose.model('Booking', bookingSchema);
