const fs = require('fs');
const path = require('path');
const os = require('os');

// Script para actualizar el usuario de PostgreSQL en .env
const fixDatabaseUser = () => {
  const envPath = path.join(__dirname, '../../.env');
  const username = os.userInfo().username;

  if (!fs.existsSync(envPath)) {
    console.log('❌ Archivo .env no existe. Cópialo desde env.example primero.');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Reemplazar DB_USER si existe
  if (envContent.includes('DB_USER=')) {
    envContent = envContent.replace(/DB_USER=.*/g, `DB_USER=${username}`);
    // También asegurar que la contraseña esté vacía si no se ha configurado
    if (envContent.includes('DB_PASSWORD=tu_contraseña_aqui')) {
      envContent = envContent.replace(/DB_PASSWORD=tu_contraseña_aqui/g, 'DB_PASSWORD=');
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Archivo .env actualizado con usuario: ${username}`);
    console.log(`✅ DB_USER=${username}`);
    console.log(`✅ DB_PASSWORD= (vacío, sin contraseña)`);
  } else {
    console.log('⚠️  No se encontró DB_USER en .env');
  }
};

if (require.main === module) {
  fixDatabaseUser();
}

module.exports = fixDatabaseUser;
