const mongoose = require("mongoose");
require("dotenv").config();


const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      throw new Error("MONGO_URI no está definida en las variables de entorno");
    }

    const options = {
      maxPoolSize: 10, // Mantener hasta 10 conexiones en el pool
      serverSelectionTimeoutMS: 5000, // Timeout después de 5s en lugar de 30s
      socketTimeoutMS: 45000, // Cerrar sockets después de 45s de inactividad
    };

    await mongoose.connect(mongoURI, options);
    console.log("✅ MongoDB Atlas conectado exitosamente");
    console.log(`📊 Base de datos: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ Error al conectar MongoDB:", error.message);
    console.error("💡 Verifica que:");
    console.error("   1. El archivo .env existe y tiene MONGO_URI configurada");
    console.error("   2. La cadena de conexión de Atlas es correcta");
    console.error("   3. Tu IP está en la whitelist de Atlas");
    console.error("   4. El usuario y contraseña son correctos");
    process.exit(1);
  }
};

// Manejar eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose conectado a MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose desconectado de MongoDB Atlas');
});

// Cerrar conexión cuando la app se cierra
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('👋 Conexión a MongoDB cerrada por terminación de la aplicación');
  process.exit(0);
});

module.exports = connectDB;