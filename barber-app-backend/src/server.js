const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const barbershopRoutes = require("./routes/barbershopRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require("./routes/adminRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const reviewRoutes = require('./routes/reviewRoutes');
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

app.use("/api/auth", authRoutes);
app.use("/api/barbershops", barbershopRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/reviews", reviewRoutes);

//Conectar la base de datos
connectDB();

//Prueba de API 
app.get("/", (req, res)=>{
    res.send("API funcionando");
})

//Configuracion del puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo el puerto ${PORT}`));