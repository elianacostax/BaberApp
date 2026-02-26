const { sequelize } = require("../config/db");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const installExtensions = async () => {
  try {
    console.log("🔄 Instalando extensiones de PostgreSQL...\n");

    await sequelize.authenticate();
    console.log("✅ Conexión establecida\n");

    // Instalar extensión UUID
    console.log("📦 Instalando extensión uuid-ossp...");
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log("✅ Extensión uuid-ossp instalada\n");

    // Instalar extensión pg_trgm (para búsquedas de texto)
    console.log("📦 Instalando extensión pg_trgm...");
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
      console.log("✅ Extensión pg_trgm instalada\n");
    } catch (error) {
      console.log("⚠️  No se pudo instalar pg_trgm (puede que no esté disponible)");
      console.log("   Esto es opcional, las búsquedas de texto funcionarán sin ella\n");
    }

    console.log("✅ Extensiones instaladas correctamente!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error al instalar extensiones:");
    console.error(error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  installExtensions();
}

module.exports = installExtensions;
