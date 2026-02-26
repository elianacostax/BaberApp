// Script para verificar el archivo .env
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');

console.log('🔍 Verificando archivo .env...\n');
console.log(`Ruta: ${envPath}`);
console.log(`Existe: ${fs.existsSync(envPath) ? '✅ Sí' : '❌ No'}\n`);

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('📄 Contenido del archivo .env:');
  console.log('─'.repeat(50));
  
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Ocultar contraseñas
    const displayLine = line.includes('PASSWORD') && line.includes('=') 
      ? line.split('=')[0] + '=***' 
      : line;
    console.log(`${(index + 1).toString().padStart(3, ' ')}: ${displayLine}`);
  });
  
  console.log('─'.repeat(50));
  
  // Verificar variables DB_
  const dbVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  console.log('\n🔎 Variables DB_ encontradas:');
  dbVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = content.match(regex);
    if (match) {
      const value = varName.includes('PASSWORD') ? '***' : match[1];
      console.log(`   ✅ ${varName}=${value}`);
    } else {
      console.log(`   ❌ ${varName} - NO ENCONTRADA`);
    }
  });
  
  // Probar cargar con dotenv
  console.log('\n🧪 Probando carga con dotenv:');
  require('dotenv').config({ path: envPath });
  
  dbVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const displayValue = varName.includes('PASSWORD') ? '***' : value;
      console.log(`   ✅ ${varName}=${displayValue}`);
    } else {
      console.log(`   ❌ ${varName} - NO CARGADA`);
    }
  });
} else {
  console.log('❌ El archivo .env no existe');
  console.log('💡 Crea el archivo .env desde env.example:');
  console.log('   cp env.example .env');
}
