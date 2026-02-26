# Guía Paso a Paso: Crear Base de Datos PostgreSQL

## Paso 1: Verificar que PostgreSQL está corriendo

```bash
# Verificar si PostgreSQL está corriendo
pg_isready

# Si no está corriendo, iniciarlo (macOS con Homebrew)
brew services start postgresql@14

# O en Linux
sudo systemctl start postgresql
```

## Paso 2: Crear la base de datos

Tienes dos opciones:

### Opción A: Usando psql (Recomendado)

```bash
# Conectarte a PostgreSQL como usuario postgres
psql -U postgres

# Dentro de psql, ejecutar:
CREATE DATABASE barberapp;

# Crear extensión para UUIDs (opcional pero recomendado)
\c barberapp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Salir de psql
\q
```

### Opción B: Usando createdb

```bash
# Crear la base de datos directamente
createdb -U postgres barberapp
```

## Paso 3: Configurar variables de entorno

1. Copia el archivo `env.example` a `.env`:
   ```bash
   cp env.example .env
   ```

2. Edita el archivo `.env` y configura las credenciales de PostgreSQL:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=barberapp
   DB_USER=postgres
   DB_PASSWORD=tu_contraseña_aqui
   ```

   **Nota:** Si no configuraste contraseña para el usuario `postgres`, déjala vacía o usa tu usuario actual de macOS.

## Paso 4: Crear las tablas

Ejecuta el script de inicialización:

```bash
cd barber-app-backend
npm run init-db
```

Este script:
- ✅ Se conecta a PostgreSQL
- ✅ Carga todos los modelos
- ✅ Crea las tablas automáticamente
- ✅ Define todas las relaciones
- ✅ Crea los índices necesarios

## Paso 5: Verificar que todo funciona

Inicia el servidor:

```bash
npm run dev
```

Deberías ver mensajes como:
```
✅ PostgreSQL conectado exitosamente
📊 Base de datos: barberapp
✅ Modelos sincronizados
🚀 Servidor corriendo en puerto 5000
```

## Estructura de Tablas Creadas

El script creará las siguientes tablas:

1. **Users** - Usuarios del sistema (clientes, barberos, admins)
2. **Barbershops** - Barberías registradas
3. **Bookings** - Reservas/citas
4. **Reviews** - Reseñas de los barberos
5. **AvailabilityBlocks** - Bloqueos de disponibilidad

## Solución de Problemas

### Error: "password authentication failed"
- Verifica la contraseña en `.env`
- Si no tienes contraseña, déjala vacía: `DB_PASSWORD=`
- O crea un usuario específico para la aplicación

### Error: "database does not exist"
- Asegúrate de haber creado la base de datos (Paso 2)
- Verifica el nombre en `.env`: `DB_NAME=barberapp`

### Error: "relation already exists"
- Las tablas ya existen, esto es normal
- El script no eliminará tablas existentes por seguridad

### Error: "permission denied"
- Asegúrate de que el usuario tenga permisos en la base de datos
- Puedes otorgar permisos con:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE barberapp TO postgres;
  ```

## Comandos Útiles

```bash
# Conectarte a la base de datos
psql -U postgres -d barberapp

# Ver todas las tablas
\dt

# Ver estructura de una tabla
\d Users

# Ver datos de una tabla
SELECT * FROM "Users" LIMIT 5;

# Eliminar todas las tablas (¡CUIDADO!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

## Siguiente Paso

Una vez que la base de datos esté creada y las tablas inicializadas, puedes:
1. Iniciar el servidor: `npm run dev`
2. Probar los endpoints de la API
3. Crear usuarios de prueba desde el frontend o usando los endpoints
