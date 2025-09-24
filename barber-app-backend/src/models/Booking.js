
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

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
