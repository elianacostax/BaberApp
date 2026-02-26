# Guía de Migración de MongoDB a PostgreSQL

## Cambios Realizados

### 1. Dependencias
- ✅ Instalado: `sequelize`, `pg`, `pg-hstore`, `sequelize-cli`
- ⚠️ Puedes remover: `mongoose`, `mongodb` (después de verificar que todo funciona)

### 2. Configuración de Base de Datos
- ✅ `src/config/db.js` - Actualizado para usar Sequelize con PostgreSQL
- ✅ `env.example` - Actualizado con variables de PostgreSQL

### 3. Modelos
Todos los modelos han sido convertidos de Mongoose a Sequelize:
- ✅ `User.js` - Convertido (usa UUID como ID, JSONB para schedule, customServices, customPrices)
- ✅ `Barbershop.js` - Convertido (usa UUID, JSONB para services y openingHours)
- ✅ `Booking.js` - Convertido (usa UUID, relaciones con User y Barbershop)
- ✅ `Review.js` - Convertido
- ✅ `AvailabilityBlock.js` - Convertido
- ✅ `models/index.js` - Creado con todas las relaciones definidas

### 4. Controladores Actualizados
- ✅ `authController.js` - Completamente actualizado
- ✅ `barbershopController.js` - Completamente actualizado
- ✅ `reviewController.js` - Completamente actualizado
- ✅ `availabilityController.js` - Completamente actualizado
- ✅ `userController.js` - Completamente actualizado
- ⚠️ `bookingController.js` - Parcialmente actualizado (necesita revisión manual)

### 5. Middleware
- ✅ `authMiddleware.js` - Actualizado

## Cambios Pendientes en bookingController.js

El archivo `bookingController.js` es muy grande y tiene muchas funciones. Necesitas actualizar manualmente las siguientes ocurrencias:

### Reemplazos Necesarios:

1. **findById → findByPk**
   ```javascript
   // Antes:
   await Booking.findById(id)
   // Después:
   await Booking.findByPk(id)
   ```

2. **findOne con sintaxis de Mongoose → Sequelize**
   ```javascript
   // Antes:
   await Booking.findOne({ barber, date, time })
   // Después:
   await Booking.findOne({ where: { barberId: barber, date, time } })
   ```

3. **Operadores de consulta**
   ```javascript
   // Antes:
   { start: { $lt: endTime }, end: { $gt: startTime } }
   // Después:
   { start: { [Op.lt]: endTime }, end: { [Op.gt]: startTime } }
   ```

4. **find() → findAll()**
   ```javascript
   // Antes:
   await Booking.find(query)
   // Después:
   await Booking.findAll({ where: query })
   ```

5. **populate() → include**
   ```javascript
   // Antes:
   await booking.populate([{ path: 'barber', select: 'name' }])
   // Después:
   await booking.reload({
     include: [{ model: User, as: 'barber', attributes: ['id', 'name'] }]
   })
   ```

6. **new Model() + save() → create()**
   ```javascript
   // Antes:
   const booking = new Booking({ ... });
   await booking.save();
   // Después:
   const booking = await Booking.create({ ... });
   ```

7. **Referencias de campos**
   - `booking.user` → `booking.userId`
   - `booking.barber` → `booking.barberId`
   - `booking.barbershop` → `booking.barbershopId`
   - `user.barbershop` → `user.barbershopId`
   - `barbershop.owner` → `barbershop.ownerId`

8. **Acceso a campos JSONB**
   - `barbershop.services.id(serviceId)` → `barbershop.services.find(s => s._id === serviceId)`
   - `barber.customServices.id(serviceId)` → `barber.customServices.find(s => s._id === serviceId)`
   - `barber.schedule.get(day)` → `barber.schedule[day]` (ya que es JSONB, no Map)

## Configuración de PostgreSQL

1. **Instalar PostgreSQL** (si no lo tienes):
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Linux
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Crear la base de datos**:
   ```sql
   CREATE DATABASE barberapp;
   CREATE USER postgres WITH PASSWORD 'tu_contraseña';
   GRANT ALL PRIVILEGES ON DATABASE barberapp TO postgres;
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` basado en `env.example`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=barberapp
   DB_USER=postgres
   DB_PASSWORD=tu_contraseña
   ```

4. **Sincronizar modelos**:
   Los modelos se sincronizarán automáticamente al iniciar el servidor en modo desarrollo.
   En producción, usa migraciones de Sequelize.

## Notas Importantes

1. **IDs**: Los IDs ahora son UUIDs en lugar de ObjectIds de MongoDB
2. **Timestamps**: Sequelize maneja automáticamente `createdAt` y `updatedAt`
3. **JSONB**: Los campos complejos (schedule, services, customServices, customPrices) ahora son JSONB
4. **Relaciones**: Todas las relaciones están definidas en `models/index.js`
5. **Validaciones**: Algunas validaciones de Mongoose se han convertido a validaciones de Sequelize

## Próximos Pasos

1. ✅ Revisar y completar la actualización de `bookingController.js`
2. ⚠️ Actualizar otros controladores si hay más (adminController, serviceController, barberController)
3. ⚠️ Actualizar scripts en `src/scripts/` si usan modelos
4. ⚠️ Probar todas las funcionalidades
5. ⚠️ Migrar datos existentes de MongoDB a PostgreSQL (si aplica)

## Comandos Útiles

```bash
# Iniciar servidor en desarrollo
npm run dev

# Ver logs de Sequelize (SQL queries)
# Cambia logging en db.js a console.log para ver las queries

# Crear migraciones (opcional, para producción)
npx sequelize-cli migration:generate --name nombre-migracion
```
