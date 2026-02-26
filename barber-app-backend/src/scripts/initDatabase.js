// Cargar dotenv PRIMERO, antes de cualquier otra cosa
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const { sequelize } = require("../config/db");
const { User, Barbershop, Booking, Review, AvailabilityBlock } = require("../models/index");

const initDatabase = async () => {
  try {
    console.log("🔄 Iniciando creación de base de datos...\n");

    // Autenticar conexión
    await sequelize.authenticate();
    console.log("✅ Conexión a PostgreSQL establecida\n");

    // Cargar modelos y relaciones (ya están cargados en models/index.js)
    console.log("📦 Modelos cargados:");
    console.log("   - User");
    console.log("   - Barbershop");
    console.log("   - Booking");
    console.log("   - Review");
    console.log("   - AvailabilityBlock\n");

    // Sincronizar modelos (crear tablas si no existen)
    console.log("🔨 Creando tablas...");
    await sequelize.sync({ force: false }); // force: false = no elimina tablas existentes
    console.log("✅ Tablas creadas/verificadas exitosamente\n");

    // Mostrar información de las tablas creadas
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("📊 Tablas en la base de datos:");
    results.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log("\n✅ Base de datos inicializada correctamente!");
    console.log("\n💡 Puedes ahora iniciar el servidor con: npm run dev");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error al inicializar la base de datos:");
    console.error("Mensaje:", error.message);
    console.error("Código:", error.code || "N/A");
    if (error.original) {
      console.error("Error original:", error.original.message);
    }
    console.error("\nStack completo:");
    console.error(error.stack);
    console.error("\n💡 Verifica que:");
    console.error("   1. PostgreSQL está corriendo");
    console.error("   2. La base de datos existe");
    console.error("   3. Las credenciales en .env son correctas");
    console.error("   4. El usuario tiene permisos en la base de datos");
    console.error("\n📋 Configuración actual:");
    const envPath = require("path").join(__dirname, "../../.env");
    const fs = require("fs");
    console.error(`   Ruta .env: ${envPath}`);
    console.error(`   .env existe: ${fs.existsSync(envPath) ? 'Sí' : 'No'}`);
    console.error(`   DB_HOST: ${process.env.DB_HOST || 'no definido'}`);
    console.error(`   DB_PORT: ${process.env.DB_PORT || 'no definido'}`);
    console.error(`   DB_NAME: ${process.env.DB_NAME || 'no definido'}`);
    console.error(`   DB_USER: ${process.env.DB_USER || 'no definido'}`);
    console.error(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(vacío)'}`);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
