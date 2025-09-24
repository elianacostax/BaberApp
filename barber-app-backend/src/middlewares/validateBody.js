
const Joi = require('joi');
const { handleError } = require('../utils/errorHandler');

// Middleware básico para validar campos requeridos (mantener compatibilidad)
const validateBody = (requiredFields = []) => {
    return(req, res, next)=>{
        const missing = requiredFields.filter(field => !req.body[field]);
        if (missing.length > 0 ) {
            return res.status(400).json({
                message: `Faltan campos obligatorios ${missing.join(', ')}`
            });
        }
        next();
    };
};

// Middleware robusto con Joi
const validateSchema = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { 
            abortEarly: false, // Mostrar todos los errores
            stripUnknown: true // Remover campos no definidos en el schema
        });

        if (error) {
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                message: 'Datos de entrada inválidos',
                errors: errorMessages
            });
        }

        // Reemplazar req.body con los datos validados y sanitizados
        req.body = value;
        next();
    };
};

// Esquemas de validación comunes
const schemas = {
    // Validación para registro de usuario
    userRegister: Joi.object({
        name: Joi.string().min(2).max(50).required().messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 50 caracteres',
            'any.required': 'El nombre es obligatorio'
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Debe proporcionar un email válido',
            'any.required': 'El email es obligatorio'
        }),
        password: Joi.string().min(6).max(128).required().messages({
            'string.min': 'La contraseña debe tener al menos 6 caracteres',
            'string.max': 'La contraseña no puede tener más de 128 caracteres',
            'any.required': 'La contraseña es obligatoria'
        }),
        role: Joi.string().valid('client', 'barber', 'admin').default('client').messages({
            'any.only': 'El rol debe ser client, barber o admin'
        })
    }),

    // Validación para login
    userLogin: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Debe proporcionar un email válido',
            'any.required': 'El email es obligatorio'
        }),
        password: Joi.string().required().messages({
            'any.required': 'La contraseña es obligatoria'
        })
    }),

    // Validación para crear barbería
    barbershopCreate: Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede tener más de 100 caracteres',
            'any.required': 'El nombre es obligatorio'
        }),
        address: Joi.string().min(5).max(200).required().messages({
            'string.min': 'La dirección debe tener al menos 5 caracteres',
            'string.max': 'La dirección no puede tener más de 200 caracteres',
            'any.required': 'La dirección es obligatoria'
        }),
        phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional().messages({
            'string.pattern.base': 'El teléfono debe contener solo números, espacios, guiones, paréntesis y el signo +'
        }),
        description: Joi.string().max(500).optional().messages({
            'string.max': 'La descripción no puede tener más de 500 caracteres'
        }),
        openingHours: Joi.object({
            openHour: Joi.number().integer().min(0).max(23).default(9).messages({
                'number.min': 'La hora de apertura debe ser entre 0 y 23',
                'number.max': 'La hora de apertura debe ser entre 0 y 23'
            }),
            closeHour: Joi.number().integer().min(1).max(23).default(18).messages({
                'number.min': 'La hora de cierre debe ser entre 1 y 23',
                'number.max': 'La hora de cierre debe ser entre 1 y 23'
            })
        }).optional(),
        services: Joi.array().items(
            Joi.object({
                name: Joi.string().min(2).max(50).required(),
                price: Joi.number().min(0).required(),
                duration: Joi.number().min(15).required()
            })
        ).optional()
    }),

    // Validación para crear reserva
    bookingCreate: Joi.object({
        barbershop: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'ID de barbería inválido',
            'any.required': 'La barbería es obligatoria'
        }),
        barber: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'ID de barbero inválido',
            'any.required': 'El barbero es obligatorio'
        }),
        serviceId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'ID de servicio inválido',
            'any.required': 'El servicio es obligatorio'
        }),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
            'string.pattern.base': 'La fecha debe estar en formato YYYY-MM-DD',
            'any.required': 'La fecha es obligatoria'
        }),
        time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
            'string.pattern.base': 'La hora debe estar en formato HH:MM',
            'any.required': 'La hora es obligatoria'
        })
    }),

    // Validación para actualizar estado de reserva
    bookingStatusUpdate: Joi.object({
        status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required().messages({
            'any.only': 'El estado debe ser pending, confirmed, cancelled o completed',
            'any.required': 'El estado es obligatorio'
        })
    }),

    // Validación para repetir reserva
    bookingRepeat: Joi.object({
        originalBookingId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'ID de reserva original inválido',
            'any.required': 'El ID de la reserva original es obligatorio'
        }),
        newDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
            'string.pattern.base': 'La nueva fecha debe estar en formato YYYY-MM-DD',
            'any.required': 'La nueva fecha es obligatoria'
        }),
        newTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
            'string.pattern.base': 'La nueva hora debe estar en formato HH:MM',
            'any.required': 'La nueva hora es obligatoria'
        })
    }),

    // Validación para agregar servicio a barbería
    serviceCreate: Joi.object({
        name: Joi.string().min(2).max(50).required().messages({
            'string.min': 'El nombre del servicio debe tener al menos 2 caracteres',
            'string.max': 'El nombre del servicio no puede tener más de 50 caracteres',
            'any.required': 'El nombre del servicio es obligatorio'
        }),
        price: Joi.number().min(0).required().messages({
            'number.min': 'El precio no puede ser negativo',
            'any.required': 'El precio es obligatorio'
        }),
        duration: Joi.number().min(15).required().messages({
            'number.min': 'La duración mínima es 15 minutos',
            'any.required': 'La duración es obligatoria'
        })
    }),

    // Validación para actualizar horarios de barbería
    barbershopHoursUpdate: Joi.object({
        openHour: Joi.number().integer().min(0).max(23).required().messages({
            'number.min': 'La hora de apertura debe ser entre 0 y 23',
            'number.max': 'La hora de apertura debe ser entre 0 y 23',
            'any.required': 'La hora de apertura es obligatoria'
        }),
        closeHour: Joi.number().integer().min(1).max(23).required().messages({
            'number.min': 'La hora de cierre debe ser entre 1 y 23',
            'number.max': 'La hora de cierre debe ser entre 1 y 23',
            'any.required': 'La hora de cierre es obligatoria'
        })
    }),

    // Validación para crear bloqueo de disponibilidad
    availabilityBlockCreate: Joi.object({
        start: Joi.date().iso().required().messages({
            'date.base': 'La fecha de inicio debe ser una fecha válida en formato ISO',
            'any.required': 'La fecha de inicio es obligatoria'
        }),
        end: Joi.date().iso().greater(Joi.ref('start')).required().messages({
            'date.base': 'La fecha de fin debe ser una fecha válida en formato ISO',
            'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio',
            'any.required': 'La fecha de fin es obligatoria'
        }),
        reason: Joi.string().min(3).max(200).required().messages({
            'string.min': 'La razón debe tener al menos 3 caracteres',
            'string.max': 'La razón no puede tener más de 200 caracteres',
            'any.required': 'La razón es obligatoria'
        }),
        type: Joi.string().valid('manual', 'holiday', 'maintenance', 'break').default('manual').messages({
            'any.only': 'El tipo debe ser manual, holiday, maintenance o break'
        }),
        appliesToAllBarbers: Joi.boolean().default(false),
        barber: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).when('appliesToAllBarbers', {
            is: false,
            then: Joi.required(),
            otherwise: Joi.optional()
        }).messages({
            'string.pattern.base': 'ID de barbero inválido'
        })
    }),

    // Validación para actualizar bloqueo de disponibilidad
    availabilityBlockUpdate: Joi.object({
        start: Joi.date().iso().optional(),
        end: Joi.date().iso().optional(),
        reason: Joi.string().min(3).max(200).optional(),
        type: Joi.string().valid('manual', 'holiday', 'maintenance', 'break').optional(),
        appliesToAllBarbers: Joi.boolean().optional()
    }).custom((value, helpers) => {
        // Validar que si se proporcionan start y end, end sea mayor que start
        if (value.start && value.end && new Date(value.end) <= new Date(value.start)) {
            return helpers.error('date.greater');
        }
        return value;
    }).messages({
        'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio'
    })
};

module.exports = { 
    validateBody, 
    validateSchema, 
    schemas 
};