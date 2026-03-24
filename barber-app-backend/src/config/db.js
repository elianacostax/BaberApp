const fs = require("fs");
const path = require("path");
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

const runBootstrapSqlScripts = async () => {
  const scriptPaths = [
    path.join(__dirname, "../scripts/addAvailabilityBlockBarbershopScope.sql"),
    path.join(__dirname, "../scripts/createNotificationJobsTable.sql"),
  ];

  for (const scriptPath of scriptPaths) {
    if (!fs.existsSync(scriptPath)) continue;
    const sql = fs.readFileSync(scriptPath, "utf8").trim();
    if (!sql) continue;
    await sequelize.query(sql);
  }
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL conectado exitosamente");
    console.log(`📊 Base de datos: ${sequelize.config.database}`);

    await runBootstrapSqlScripts();
    
    // Cargar modelos y relaciones
    require("../models/index");
    
    // En una base existente, sync puede romper enums/constraints legacy.
    // Solo se habilita si se solicita explícitamente.
    if (process.env.DB_SYNC === "true") {
      await sequelize.sync({ alter: false });
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
