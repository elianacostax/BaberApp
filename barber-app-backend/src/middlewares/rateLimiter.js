const rateLimit = require('express-rate-limit');

// Rate limiter general para la API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 requests por IP por ventana (aumentado para desarrollo)
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true, // Incluir headers de rate limit
  legacyHeaders: false, // Deshabilitar headers X-RateLimit-*
  handler: (req, res) => {
    res.status(429).json({
      message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiter más estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP por ventana
  message: {
    error: 'Demasiados intentos de login, intenta de nuevo en 15 minutos.'
  },
  skipSuccessfulRequests: true, // No contar requests exitosos
  handler: (req, res) => {
    res.status(429).json({
      message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiter para creación de reservas
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 reservas por IP por 15 minutos
  message: {
    error: 'Demasiadas reservas creadas, intenta de nuevo en 15 minutos.'
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Demasiadas reservas creadas, intenta de nuevo en 15 minutos.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiter más permisivo para operaciones de barberos y admins
const staffBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 operaciones por IP por 15 minutos
  message: {
    error: 'Demasiadas operaciones de reservas, intenta de nuevo en 15 minutos.'
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Demasiadas operaciones de reservas, intenta de nuevo en 15 minutos.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiter para operaciones de administración
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 operaciones admin por IP por 15 minutos
  message: {
    error: 'Demasiadas operaciones de administración, intenta de nuevo en 15 minutos.'
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Demasiadas operaciones de administración, intenta de nuevo en 15 minutos.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  bookingLimiter,
  staffBookingLimiter,
  adminLimiter
};
