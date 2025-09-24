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

module.exports = mongoose.model('AvailabilityBlock', availabilityBlockSchema);