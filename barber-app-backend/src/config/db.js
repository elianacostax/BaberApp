const { Sequelize } = require("sequelize");
require("dotenv").config();

// Configuración de la base de datos PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME || "barberapp",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
); 

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL conectado exitosamente");
    console.log(`📊 Base de datos: ${sequelize.config.database}`);
    
    // Cargar modelos y relaciones
    require("../models/index");
    
    // Sincronizar modelos (en desarrollo, en producción usar migraciones)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: false }); // alter: false para no modificar estructura existente
      console.log("✅ Modelos sincronizados");
    }
  } catch (error) {
    console.error("❌ Error al conectar PostgreSQL:", error.message);
    console.error("💡 Verifica que:");
    console.error("   1. El archivo .env existe y tiene las variables DB_* configuradas");
    console.error("   2. PostgreSQL está corriendo");
    console.error("   3. La base de datos existe");
    console.error("   4. El usuario y contraseña son correctos");
    process.exit(1);
  }
};

// Cerrar conexión cuando la app se cierra
process.on("SIGINT", async () => {
  await sequelize.close();
  console.log("👋 Conexión a PostgreSQL cerrada por terminación de la aplicación");
  process.exit(0);
});

module.exports = { sequelize, connectDB };