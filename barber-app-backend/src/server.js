const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const barbershopRoutes = require("./routes/barbershopRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require("./routes/adminRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const reviewRoutes = require('./routes/reviewRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const barberRoutes = require('./routes/barberRoutes');
const { generalLimiter, authLimiter, adminLimiter } = require("./middlewares/rateLimiter");
const { logRequest, logger } = require("./utils/logger");
require("dotenv").config();
const app = express();




// Configuración de CORS
app.use(cors({
  origin: ["http://localhost:5173"], // ¡IMPORTANTE! Reemplaza 5173 si tu frontend usa otro puerto
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos HTTP que permitirás
  credentials: true, // Habilitar el envío de cookies de origen cruzado (si tu backend las usa)
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
}));

// Middlewares
app.use(express.json());

// Rate limiting global
app.use(generalLimiter);

// Logging de requests
app.use(logRequest);

// Rutas con rate limiting específico
app.use("/api/auth", authLimiter, authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);

// Rutas sin rate limiting específico
app.use("/api/barbershops", barbershopRoutes);
app.use('/api/users', userRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/barbers", barberRoutes);

//Conectar la base de datos
connectDB();

//Prueba de API 
app.get("/", (req, res)=>{
    res.send("API funcionando");
})

// Middleware global de manejo de errores (debe estar al final)
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Manejo de rutas no encontradas (debe estar al final)
app.use('*', (req, res) => {
    logger.warn('Route not found', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    
    res.status(404).json({
        message: 'Ruta no encontrada'
    });
});

//Configuracion del puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
