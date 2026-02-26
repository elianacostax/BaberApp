# 🚀 Guía Rápida: Crear Base de Datos PostgreSQL

## Opción 1: Automática (Recomendada) ⚡

Ejecuta un solo comando que hace todo por ti:

```bash
cd barber-app-backend
npm run setup-db
```

Este script:
- ✅ Verifica que PostgreSQL esté instalado
- ✅ Inicia PostgreSQL si no está corriendo
- ✅ Crea la base de datos `barberapp`
- ✅ Crea la extensión UUID
- ✅ Crea el archivo `.env` si no existe
- ✅ Crea todas las tablas automáticamente

## Opción 2: Manual (Paso a Paso) 📝

### Paso 1: Iniciar PostgreSQL

**macOS (Homebrew):**
```bash
brew services start postgresql@14
# o si tienes otra versión:
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

**Verificar que está corriendo:**
```bash
pg_isready
# Debe mostrar: /tmp:5432 - accepting connections
```

### Paso 2: Crear la Base de Datos

```bash
# Opción A: Usando createdb (más fácil)
createdb barberapp

# Opción B: Usando psql
psql -U postgres
CREATE DATABASE barberapp;
\q
```

### Paso 3: Crear Extensión UUID

```bash
psql -d barberapp -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Paso 4: Configurar Variables de Entorno

```bash
# Si no existe .env, copiarlo desde env.example
cp env.example .env

# Editar .env y configurar (si es necesario):
# DB_PASSWORD=tu_contraseña
# Si no tienes contraseña, déjala vacía: DB_PASSWORD=
```

### Paso 5: Crear las Tablas

```bash
npm run init-db
```

## ✅ Verificación

Después de ejecutar los pasos, deberías ver:

```
✅ Conexión a PostgreSQL establecida
📦 Modelos cargados:
   - User
   - Barbershop
   - Booking
   - Review
   - AvailabilityBlock
🔨 Creando tablas...
✅ Tablas creadas/verificadas exitosamente
📊 Tablas en la base de datos:
   ✓ AvailabilityBlocks
   ✓ Barbershops
   ✓ Bookings
   ✓ Reviews
   ✓ Users
✅ Base de datos inicializada correctamente!
```

## 🎯 Iniciar el Servidor

Una vez que todo esté configurado:

```bash
npm run dev
```

Deberías ver:
```
✅ PostgreSQL conectado exitosamente
📊 Base de datos: barberapp
✅ Modelos sincronizados
🚀 Servidor corriendo en puerto 5000
```

## 🔍 Verificar Tablas Creadas

Puedes conectarte a PostgreSQL y ver las tablas:

```bash
psql -d barberapp

# Dentro de psql:
\dt                    # Ver todas las tablas
\d "Users"            # Ver estructura de la tabla Users
SELECT * FROM "Users" LIMIT 5;  # Ver datos de ejemplo
\q                    # Salir
```

## ❌ Solución de Problemas

### Error: "password authentication failed"
```bash
# Verifica tu usuario de PostgreSQL
whoami

# Usa tu usuario actual en .env:
DB_USER=tu_usuario
DB_PASSWORD=
```

### Error: "database does not exist"
```bash
# Crea la base de datos manualmente:
createdb barberapp
```

### Error: "permission denied"
```bash
# Otorga permisos:
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE barberapp TO tu_usuario;
\q
```

### PostgreSQL no inicia
```bash
# macOS:
brew services restart postgresql@14

# Linux:
sudo systemctl restart postgresql
```

## 📋 Estructura de Tablas

Las siguientes tablas se crearán automáticamente:

1. **Users** - Usuarios (clientes, barberos, admins)
   - Campos: id (UUID), name, email, password, role, etc.

2. **Barbershops** - Barberías
   - Campos: id (UUID), name, address, location, ownerId, services (JSONB), etc.

3. **Bookings** - Reservas/Citas
   - Campos: id (UUID), barbershopId, barberId, userId, date, time, status, etc.

4. **Reviews** - Reseñas
   - Campos: id (UUID), userId, barberId, bookingId, rating, comment, etc.

5. **AvailabilityBlocks** - Bloqueos de disponibilidad
   - Campos: id (UUID), barberId, start, end, reason, etc.

## 🎉 ¡Listo!

Tu base de datos está configurada y lista para usar. Puedes ahora:
- Iniciar el servidor: `npm run dev`
- Probar los endpoints de la API
- Crear usuarios desde el frontend
