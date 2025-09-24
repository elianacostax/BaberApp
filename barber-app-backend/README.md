# 🚀 BarberApp Backend

Backend robusto para aplicación de gestión de citas de barbería con funcionalidades avanzadas de seguridad, logging y optimización.

## ✨ Características Principales

### 🔐 Seguridad
- **Autenticación JWT** con tokens seguros
- **Rate Limiting** configurado por tipo de endpoint
- **Encriptación de contraseñas** con bcryptjs
- **Validación robusta** de datos con Joi
- **Control de acceso** por roles (client, barber, admin)

### 📊 Logging y Monitoreo
- **Sistema de logging** con Winston
- **Logs estructurados** en archivos separados
- **Monitoreo de requests** con métricas de tiempo
- **Manejo de errores** centralizado

### ⚡ Optimización
- **Índices de MongoDB** para consultas rápidas
- **Scripts de mantenimiento** para limpieza de datos
- **Validaciones** en modelo y aplicación

### 🛠️ Funcionalidades
- Gestión completa de reservas
- Sistema de disponibilidad y bloqueos
- Múltiples barberías y barberos
- Estados de reserva (pending, confirmed, cancelled, completed)
- Repetición de reservas
- Gestión de horarios personalizados

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (v16 o superior)
- MongoDB (local o Atlas)
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd barber-app-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus configuraciones
```

### Configuración de Variables de Entorno
```env
# Base de datos
MONGO_URI=mongodb://localhost:27017/barberApp

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro

# Servidor
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting (opcional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🏃‍♂️ Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Scripts Disponibles
```bash
# Crear índices de MongoDB para optimización
npm run create-indexes

# Limpiar reservas corruptas
npm run cleanup-bookings
```

## 📁 Estructura del Proyecto

```
src/
├── config/
│   └── db.js                 # Configuración de MongoDB
├── controllers/
│   ├── authController.js     # Autenticación y registro
│   ├── bookingController.js  # Gestión de reservas
│   ├── availabilityController.js # Bloqueos de disponibilidad
│   ├── barbershopController.js   # Gestión de barberías
│   ├── userController.js     # Gestión de usuarios
│   ├── adminController.js    # Funciones administrativas
│   └── reviewController.js   # Sistema de reseñas
├── middlewares/
│   ├── authMiddleware.js     # Autenticación JWT
│   ├── roleMiddleware.js     # Control de roles
│   ├── validateBody.js       # Validaciones con Joi
│   └── rateLimiter.js        # Rate limiting
├── models/
│   ├── User.js              # Modelo de usuario
│   ├── Barbershop.js        # Modelo de barbería
│   ├── Booking.js           # Modelo de reserva
│   ├── AvailabilityBlock.js # Modelo de bloqueos
│   └── Review.js            # Modelo de reseñas
├── routes/
│   ├── authRoutes.js        # Rutas de autenticación
│   ├── bookingRoutes.js     # Rutas de reservas
│   ├── availabilityRoutes.js # Rutas de disponibilidad
│   ├── barbershopRoutes.js  # Rutas de barberías
│   ├── userRoutes.js        # Rutas de usuarios
│   ├── adminRoutes.js       # Rutas administrativas
│   └── reviewRoutes.js      # Rutas de reseñas
├── scripts/
│   ├── createIndexes.js     # Script para crear índices
│   └── cleanupBookings.js   # Script de limpieza
├── utils/
│   ├── logger.js            # Sistema de logging
│   └── errorHandler.js      # Manejo de errores
└── server.js                # Servidor principal
```

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión

### Reservas
- `POST /api/bookings` - Crear reserva
- `GET /api/bookings` - Obtener reservas
- `GET /api/bookings/availability` - Consultar disponibilidad
- `PATCH /api/bookings/:id` - Actualizar estado
- `POST /api/bookings/repeat` - Repetir reserva
- `PUT /api/bookings/:id/cancel` - Cancelar reserva

### Disponibilidad
- `POST /api/availability` - Crear bloqueo
- `GET /api/availability` - Obtener bloqueos
- `PUT /api/availability/:id` - Actualizar bloqueo
- `DELETE /api/availability/:id` - Eliminar bloqueo

### Barberías
- `GET /api/barbershops` - Listar barberías
- `POST /api/barbershops` - Crear barbería
- `GET /api/barbershops/:id` - Obtener barbería
- `PUT /api/barbershops/:id` - Actualizar barbería

## 🛡️ Seguridad Implementada

### Rate Limiting
- **General**: 100 requests/15min por IP
- **Autenticación**: 5 intentos/15min por IP
- **Reservas**: 10 reservas/hora por IP
- **Administración**: 50 operaciones/hora por IP

### Validaciones
- Validación de entrada con Joi
- Sanitización de datos
- Validación de tipos y formatos
- Mensajes de error personalizados

### Logging
- Logs de requests con métricas
- Logs de errores con contexto
- Rotación automática de archivos
- Diferentes niveles de log

## 📈 Optimización

### Índices de MongoDB
- Consultas optimizadas por barbero y fecha
- Índices para búsquedas de texto
- Índices para consultas de solapamiento
- Índices para ordenamiento

### Scripts de Mantenimiento
- Limpieza automática de datos corruptos
- Creación de índices para rendimiento
- Validación de integridad de datos

## 🚨 Monitoreo y Logs

Los logs se guardan en:
- `logs/error.log` - Solo errores
- `logs/combined.log` - Todos los logs

Niveles de log disponibles:
- `error` - Solo errores
- `warn` - Advertencias y errores
- `info` - Información general (por defecto)
- `debug` - Información detallada

## 🔄 Mantenimiento

### Limpieza de Datos
```bash
# Limpiar reservas corruptas
npm run cleanup-bookings
```

### Optimización de Base de Datos
```bash
# Crear índices para mejor rendimiento
npm run create-indexes
```

## 🐛 Solución de Problemas

### Errores Comunes
1. **Error de conexión a MongoDB**: Verificar MONGO_URI en .env
2. **Rate limit excedido**: Esperar el tiempo de reset o ajustar límites
3. **Token JWT inválido**: Verificar JWT_SECRET y expiración

### Logs de Debug
Para más información de debug, cambiar LOG_LEVEL en .env:
```env
LOG_LEVEL=debug
```

## 📝 Notas de Desarrollo

- El proyecto usa Luxon para manejo de fechas y zonas horarias
- Los horarios se manejan en zona horaria de Colombia (America/Bogota)
- Las validaciones incluyen verificación de solapamientos de citas
- El sistema soporta múltiples barberías con barberos independientes

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.
