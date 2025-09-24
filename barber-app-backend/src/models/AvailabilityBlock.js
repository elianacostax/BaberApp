const mongoose = require('mongoose');

const availabilityBlockSchema = new mongoose.Schema({
    barber: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String, default: "manual" },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
     appliesToAllBarbers: { type: Boolean, default: false },
}, { timestamps: true });

// Índices para optimización de consultas
availabilityBlockSchema.index({ barber: 1, start: 1, end: 1 }); // Para consultas por barbero y rango de fechas
availabilityBlockSchema.index({ appliesToAllBarbers: 1, start: 1, end: 1 }); // Para consultas globales
availabilityBlockSchema.index({ start: 1, end: 1 }); // Para consultas de solapamiento
availabilityBlockSchema.index({ createdBy: 1 }); // Para consultas por creador

module.exports = mongoose.model('AvailabilityBlock', availabilityBlockSchema);