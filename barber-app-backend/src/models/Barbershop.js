const mongoose = require("mongoose");

const barbershopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        phone: { type: String }, // Campo útil para contacto
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        services: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true, min: 0 },
                duration: { type: Number, required: true, min: 15 } // mínimo 15 min
            }
        ],
        // CORREGIDO: objeto en lugar de array
        openingHours: {
            openHour: { type: Number, required: true, default: 9, min: 0, max: 23 },
            closeHour: { type: Number, required: true, default: 18, min: 1, max: 23 }
        },
        // Campos adicionales útiles
        isActive: { type: Boolean, default: true },
        description: { type: String, maxlength: 500 },
        images: [String], // URLs de imágenes de la barbería
    },
    { timestamps: true }
);

// Validación personalizada para horarios
barbershopSchema.pre('save', function(next) {
    if (this.openingHours.openHour >= this.openingHours.closeHour) {
        const error = new Error('La hora de apertura debe ser menor que la de cierre');
        return next(error);
    }
    next();
});

module.exports = mongoose.model("Barbershop", barbershopSchema);