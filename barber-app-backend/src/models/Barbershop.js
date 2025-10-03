const mongoose = require("mongoose");

const barbershopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        location: { type: String, required: true }, // Ciudad o zona
        phone: { type: String }, // Campo útil para contacto
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        services: [
            {
                name: { 
                    type: String, 
                    required: true,
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
                    required: true, 
                    min: [0, 'El precio no puede ser negativo'] 
                },
                duration: { 
                    type: Number, 
                    required: true, 
                    min: [15, 'La duración mínima es 15 minutos'] 
                },
                category: {
                    type: String,
                    enum: ['haircut', 'beard', 'styling', 'treatment', 'other'],
                    default: 'other'
                },
                isActive: {
                    type: Boolean,
                    default: true
                },
                isRequired: {
                    type: Boolean,
                    default: false // Si es true, todos los barberos deben ofrecerlo
                }
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

// Índices para optimización de consultas
barbershopSchema.index({ owner: 1 }); // Para consultas por propietario
barbershopSchema.index({ isActive: 1 }); // Para consultas por estado activo
barbershopSchema.index({ name: 'text', address: 'text', description: 'text' }); // Índice de texto para búsquedas

module.exports = mongoose.model("Barbershop", barbershopSchema);