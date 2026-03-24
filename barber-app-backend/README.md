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

# Notificaciones de reservas
BOOKING_NOTIFICATIONS_ENABLED=true
BOOKING_EMAIL_NOTIFICATIONS_ENABLED=true
BOOKING_WHATSAPP_NOTIFICATIONS_ENABLED=true
BOOKING_BUFFER_MINUTES=10
BOOKING_SLOT_STEP_MINUTES=15
BOOKING_REMINDERS_ENABLED=true
BOOKING_REMINDER_WINDOWS_MINUTES=1440,120
BOOKING_REMINDER_TOLERANCE_MINUTES=15
BOOKING_REMINDERS_DRY_RUN=false
NOTIFICATION_QUEUE_MAX_ATTEMPTS=3
NOTIFICATION_QUEUE_RETRY_DELAY_SECONDS=60
NOTIFICATION_QUEUE_BATCH_SIZE=25
NOTIFICATION_QUEUE_LOCK_MINUTES=5
NOTIFICATION_QUEUE_AUTO_PROCESS=false
NOTIFICATION_QUEUE_POLL_INTERVAL_MS=30000
NOTIFICATION_QUEUE_WORKER_ID=

# SMTP
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@barberapp.local

# WhatsApp provider: twilio o webhook
WHATSAPP_PROVIDER=twilio

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Webhook WhatsApp alternativo
WHATSAPP_WEBHOOK_URL=
WHATSAPP_WEBHOOK_TOKEN=

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

# Enviar recordatorios de citas próximas
npm run send-booking-reminders

# Procesar jobs pendientes de notificaciones
npm run process-notification-queue
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
- `GET /api/bookings/recommendation` - Recomendar mejor barbero disponible
- `PATCH /api/bookings/:id` - Actualizar estado
- `POST /api/bookings/repeat` - Repetir reserva
- `PUT /api/bookings/:id/cancel` - Cancelar reserva

### Notificaciones de reservas
- Se disparan al crear, repetir, cancelar, cambiar estado, reasignar barbero y crear walk-in
- Destinatarios: cliente, barbero y barbería
- Canales soportados actualmente: email y WhatsApp
- La barbería se notifica al teléfono del negocio y al email/teléfono del owner cuando existe
- Ahora se encolan de forma persistente en `NotificationJobs`
- Estados disponibles: `pending`, `sent`, `failed`
- Los reintentos usan backoff exponencial hasta `NOTIFICATION_QUEUE_MAX_ATTEMPTS`
- Para procesarlas puedes:
  - correr `npm run process-notification-queue` desde cron o scheduler
  - o activar `NOTIFICATION_QUEUE_AUTO_PROCESS=true` para que el backend procese la cola en segundo plano

### Recordatorios automáticos
- Ejecuta `npm run send-booking-reminders` cada 5 o 10 minutos desde cron, PM2 o el scheduler de tu hosting
- Ventanas configurables con `BOOKING_REMINDER_WINDOWS_MINUTES`, por defecto `1440,120` minutos
- Tolerancia configurable con `BOOKING_REMINDER_TOLERANCE_MINUTES`
- Usa `dispatchKey` y la cola persistente para no reenviar el mismo recordatorio dos veces
- Puedes probar sin enviar mensajes reales con `BOOKING_REMINDERS_DRY_RUN=true`

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
