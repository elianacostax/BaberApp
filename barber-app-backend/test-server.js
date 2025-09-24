const express = require("express");
require("dotenv").config();

const app = express();

// Middleware básico
app.use(express.json());

// Ruta de prueba simple
app.get("/", (req, res) => {
    res.send("API funcionando - Test");
});

// Configuración del puerto
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor de prueba corriendo en puerto ${PORT}`);
});
