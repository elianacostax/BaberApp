# Funcionamiento Completo de BarberApp

## Tabla de Contenidos
- [1. Vista General](#1-vista-general)
- [2. Arquitectura de Alto Nivel](#2-arquitectura-de-alto-nivel)
- [3. Roles y Permisos](#3-roles-y-permisos)
- [4. Flujo Completo por Usuario](#4-flujo-completo-por-usuario)
- [5. Flujo de Reservas y Agenda](#5-flujo-de-reservas-y-agenda)
- [6. Flujo de Notificaciones](#6-flujo-de-notificaciones)
- [7. Modelo de Datos Explicado](#7-modelo-de-datos-explicado)
- [8. Endpoints Principales y su Función](#8-endpoints-principales-y-su-función)
- [9. Paneles y Pantallas del Frontend](#9-paneles-y-pantallas-del-frontend)
- [10. Procesos Automáticos y Tareas Operativas](#10-procesos-automáticos-y-tareas-operativas)
- [11. Problemas Conocidos y Consideraciones Operativas](#11-problemas-conocidos-y-consideraciones-operativas)
- [12. Resumen Rápido del Sistema](#12-resumen-rápido-del-sistema)

## 1. Vista General
BarberApp es una aplicación para administrar barberías, barberos, clientes y reservas en un mismo entorno. El sistema busca resolver tres necesidades al mismo tiempo:

1. permitir que un cliente reserve una cita de forma sencilla;
2. permitir que un barbero administre su agenda, sus servicios y sus clientes;
3. permitir que una barbería gestione operación, personal, reservas y seguimiento.

El sistema está diseñado con aislamiento por barbería. Eso significa que la información operativa clave se organiza alrededor de una barbería concreta:

- sus barberos;
- sus clientes;
- sus reservas;
- sus bloqueos de agenda;
- sus notificaciones;
- su configuración operativa.

### Módulos principales
- Autenticación
- Barberías
- Usuarios
- Reservas
- Disponibilidad y bloqueos
- Servicios
- Reseñas
- Notificaciones
- Panel admin, panel barbero y panel cliente

## 2. Arquitectura de Alto Nivel
La aplicación se divide en dos grandes partes:

### Frontend
Construido con React, Vite, TypeScript, React Router y React Query.

Su responsabilidad es:
- mostrar pantallas y paneles por rol;
- capturar acciones del usuario;
- consumir la API del backend;
- mantener la sesión autenticada;
- reflejar el estado de reservas, agenda, servicios y favoritos.

### Backend
Construido con Express, Sequelize y PostgreSQL.

Su responsabilidad es:
- autenticar usuarios;
- aplicar permisos por rol;
- validar reglas de negocio;
- calcular disponibilidad real;
- crear y actualizar reservas;
- encolar y procesar notificaciones;
- centralizar la lógica multi-barbería.

### Base de datos
PostgreSQL guarda las entidades principales:
- usuarios;
- barberías;
- reservas;
- reseñas;
- bloqueos de disponibilidad;
- cola de notificaciones.

### Cola de notificaciones
La aplicación ya no depende solo de envíos inmediatos. Usa una cola persistente con reintentos:

- crea jobs de notificación;
- los deja en estado `pending`;
- un worker o script los procesa;
- pasan a `sent` o `failed`.

### Relación general entre capas
```text
Usuario -> Frontend React -> API Express -> PostgreSQL
                               |
                               -> Cola NotificationJobs
                               -> Worker / scripts
                               -> Email / WhatsApp
```

## 3. Roles y Permisos
La aplicación trabaja con cuatro roles.

### `client`
Es el usuario final que reserva citas.

Puede:
- registrarse e iniciar sesión;
- ver barberías y barberos;
- marcar favoritos;
- crear reservas;
- repetir reservas;
- cancelar reservas dentro de la ventana permitida;
- ver historial y perfil.

No puede:
- administrar usuarios;
- crear barberías;
- modificar agendas de barberos;
- gestionar reservas ajenas.

### `barber`
Es el usuario operativo que atiende clientes.

Puede:
- ver su agenda;
- confirmar, completar o cancelar citas según el flujo permitido;
- gestionar su horario;
- gestionar servicios propios;
- crear reservas para clientes;
- crear walk-ins;
- consultar clientes atendidos.

No puede:
- cambiarse de barbería por sí mismo;
- ver datos operativos de otras barberías;
- administrar toda la plataforma.

### `owner`
Es el administrador de una barbería concreta.

Puede:
- administrar su barbería;
- crear barberos y clientes de su barbería;
- ver reservas de su negocio;
- gestionar configuración operativa;
- ver diagnósticos de barberos;
- reasignar reservas dentro de su barbería.

No puede:
- administrar barberías ajenas;
- operar como super administrador global.

### `admin`
Es el administrador global de la plataforma.

Puede:
- ver todas las barberías;
- ver todos los usuarios;
- administrar reservas globales;
- ejecutar funciones globales de supervisión;
- ver diagnósticos globales;
- administrar cola y notificaciones cuando se exponga UI para ello.

No debe confundirse con el `owner`.

### Diferencia clave entre `owner` y `admin`
- `owner`: administra solo su barbería.
- `admin`: administra toda la plataforma.

### Cómo se aplican restricciones por barbería
El backend usa principalmente:
- `barbershopId` en usuarios, reservas y bloqueos;
- validaciones en controladores;
- filtros por rol;
- limitación del alcance de `owner` a sus barberías.

## 4. Flujo Completo por Usuario

### Cliente
#### Registro e inicio de sesión
El cliente puede:
- registrarse por `POST /api/auth/register`;
- iniciar sesión por `POST /api/auth/login`;
- restaurar contraseña si la olvida.

El frontend guarda:
- token JWT;
- usuario autenticado;
- rol;
- `barbershopId` si aplica.

#### Favoritos
El cliente puede marcar:
- barberos favoritos;
- barberías favoritas.

Esto ayuda a acelerar la selección futura dentro del flujo de reserva.

#### Selección de barbería
En el flujo de reserva el cliente primero elige una barbería.

Esto define:
- qué servicios se consultan;
- qué barberos se listan;
- qué agenda se puede calcular.

#### Selección de servicio
Luego elige un servicio disponible para la barbería.

Ese servicio se usa para:
- validar duración;
- calcular precio;
- filtrar barberos compatibles;
- calcular slots disponibles.

#### Selección manual o automática de barbero
El cliente puede:
- elegir manualmente un barbero;
- dejar que el sistema recomiende el mejor disponible.

Si elige modo automático:
- el frontend llama a recomendación;
- el backend evalúa disponibilidad real;
- el sistema propone al barbero con mejor ajuste.

#### Selección de fecha y hora
Con barbería, servicio y barbero definidos o recomendados:
- se consulta disponibilidad;
- se muestran slots válidos;
- el cliente elige el horario.

#### Creación de reserva
Al confirmar:
- el backend valida reglas completas;
- crea la reserva;
- registra historial de la reserva;
- encola notificaciones.

#### Consulta de citas
El cliente puede ver:
- próximas citas;
- historial;
- detalle de cada reserva.

#### Repetición y cancelación
Puede:
- repetir una reserva previa;
- cancelar una reserva si todavía cumple la regla de anticipación mínima.

#### Perfil
El cliente puede consultar:
- información personal;
- citas próximas;
- información de barbería y barbero asociados a la reserva.

### Barbero
#### Acceso al dashboard
El barbero entra a su panel y puede ver:
- resumen del día;
- agenda;
- servicios;
- clientes;
- reseñas.

#### Gestión de agenda
Puede:
- revisar citas por día o semana;
- ver detalle de servicio, cliente y barbería;
- cambiar estado de la cita.

#### Gestión de horario
Cada barbero tiene un `schedule` por día.

Ese horario es una de las fuentes principales para calcular disponibilidad.

#### Gestión de servicios
Puede trabajar con dos tipos de servicios:
- servicios de la barbería con activación/precio personalizado;
- servicios propios personalizados.

#### Gestión de clientes
Puede ver:
- clientes atendidos;
- historial de atención;
- datos básicos del cliente.

#### Walk-in
Puede crear reservas presenciales para clientes no registrados.

Eso genera una reserva válida en agenda con datos temporales del cliente.

### Owner / Admin
#### Gestión de barberías
Pueden:
- listar barberías;
- editar datos;
- configurar horarios generales;
- administrar servicios de una barbería.

#### Gestión de usuarios
Pueden:
- crear barberos;
- crear clientes;
- actualizar usuarios;
- asignar barberos a barberías;
- activar o desactivar usuarios.

#### Diagnóstico de barberos
Ya existe diagnóstico operativo para detectar:
- barberos sin servicios activos;
- barberos sin horario configurado.

#### Gestión de reservas
Pueden:
- consultar reservas;
- cambiar estados;
- reasignar barbero;
- eliminar reservas según permisos.

#### Reportes
Pueden ver:
- volumen de reservas;
- ingresos;
- top barberos;
- comportamiento por barbería.

#### Configuración operativa
Incluye la capacidad de ajustar:
- barberías;
- servicios;
- asignación de personal;
- reglas y estado del negocio en el panel correspondiente.

## 5. Flujo de Reservas y Agenda
Este es el núcleo del sistema.

### Flujo real de una reserva
```text
Cliente elige barbería
-> elige servicio
-> elige barbero o modo automático
-> elige fecha
-> se consultan slots válidos
-> confirma horario
-> backend valida todo
-> se crea la reserva
-> se guarda historial
-> se encolan notificaciones
```

### Validaciones que aplica el backend
Antes de crear una reserva se valida:

1. barbería válida;
2. servicio válido;
3. barbero válido;
4. que el barbero pertenezca a la barbería;
5. que el cliente esté asociado a la barbería correcta o pueda asignarse;
6. anticipación mínima;
7. horario de apertura de la barbería;
8. horario laboral del barbero;
9. bloqueos de disponibilidad;
10. conflictos con otras reservas;
11. buffer entre citas.

### Cómo funciona la recomendación automática de barbero
El backend:
- toma todos los barberos activos de la barbería;
- descarta los que no pueden atender el servicio;
- calcula disponibilidad real de cada uno;
- compara si tienen slot exacto o cercano;
- prioriza menor conflicto y mejor disponibilidad.

El resultado entrega:
- barbero recomendado;
- primer slot libre;
- coincidencia exacta si existe;
- candidatos alternativos.

### Cómo se calculan los slots
Para cada barbero:
- se toma la fecha solicitada;
- se obtiene su ventana de trabajo;
- se cruza con el horario general de la barbería;
- se generan slots por paso configurable;
- se eliminan slots bloqueados;
- se eliminan slots que chocan con reservas activas;
- se respeta el buffer entre citas;
- se filtran horarios pasados o demasiado cercanos.

### Qué pasa si no hay disponibilidad
El sistema puede responder:
- sin horarios para ese barbero;
- sin barbero compatible;
- sin recomendación automática;
- horario bloqueado o solapado.

### Tipos de reserva
#### Reserva cliente
La crea el usuario cliente desde el frontend público autenticado.

#### Reserva staff
La crea `barber`, `owner` o `admin` para un cliente.

#### Walk-in
La crea staff para una atención presencial sin usuario registrado formal.

## 6. Flujo de Notificaciones
Las notificaciones ya forman parte del flujo operativo.

### Eventos que generan notificación
- creación de reserva;
- repetición;
- cambio de estado;
- cancelación;
- cambio de barbero;
- walk-in;
- recordatorios previos.

### Destinatarios
- cliente;
- barbero;
- barbería.

La barbería se notifica usando:
- teléfono del negocio;
- o teléfono/email del owner si aplica.

### Canales
- Email
- WhatsApp

### Cómo funciona la cola persistente
El backend transforma un evento en jobs almacenados en `NotificationJobs`.

Estados:
- `pending`: pendiente de procesar;
- `sent`: entregado correctamente;
- `failed`: agotó reintentos o falló de forma terminal.

### Reintentos
Si falla un envío:
- aumenta `attempts`;
- calcula el siguiente intento con backoff;
- vuelve a `pending`;
- si supera `maxAttempts`, termina en `failed`.

### Worker y scripts
La cola puede procesarse de dos formas:

1. worker automático en segundo plano;
2. script manual o scheduler.

Flujo:
```text
Reserva creada
-> notifyBookingEvent
-> se crean NotificationJobs
-> worker o script reclama jobs pendientes
-> envía email/WhatsApp
-> actualiza estado del job
-> guarda historial en la reserva
```

### Recordatorios
Los recordatorios se generan según ventanas configurables, por ejemplo:
- 24 horas antes;
- 2 horas antes.

Su finalidad es:
- recordar la cita;
- reducir ausencias;
- mantener informado a cliente, barbero y barbería.

## 7. Modelo de Datos Explicado

### `User`
Representa personas del sistema:
- cliente;
- barbero;
- owner;
- admin.

Guarda identidad, rol, barbería asociada, horario, servicios personalizados, precios personalizados y preferencias.

### `Barbershop`
Representa un negocio o unidad operativa.

Guarda:
- nombre;
- ubicación;
- owner;
- horarios generales;
- servicios del negocio.

### `Booking`
Representa una cita.

Guarda:
- barbería;
- barbero;
- cliente;
- servicio;
- fecha y hora;
- duración;
- precio;
- estado;
- notas;
- historial embebido.

### `AvailabilityBlock`
Representa bloqueos de agenda.

Puede aplicarse:
- a un barbero;
- o a todos los barberos de una barbería.

### `Review`
Representa una reseña sobre una atención.

Relaciona:
- cliente;
- barbero;
- reserva.

### `NotificationJob`
Representa un envío pendiente o procesado de notificación.

Guarda:
- evento;
- canal;
- destino;
- estado;
- intentos;
- payload del mensaje;
- bloqueo de worker;
- marca de envío o error.

### Relación entre entidades
```text
Barbershop -> tiene muchos Users(barbers/clients)
Barbershop -> tiene muchas Bookings
Barbershop -> tiene muchos AvailabilityBlocks
Barbershop -> tiene muchos NotificationJobs

User(barber) -> tiene muchas Bookings
User(client) -> tiene muchas Bookings

Booking -> pertenece a una Barbershop
Booking -> pertenece a un barber
Booking -> pertenece a un client
Booking -> puede tener una Review
Booking -> puede tener muchos NotificationJobs
```

### Importancia de `barbershopId`
`barbershopId` es la pieza que mantiene el aislamiento multi-barbería.

Su función es evitar mezcla de operación entre negocios distintos. Se usa para:
- filtrar usuarios;
- validar reservas;
- limitar agenda;
- acotar bloqueos;
- limitar diagnóstico y reportes;
- construir notificaciones por negocio.

## 8. Endpoints Principales y su Función
No se listan todos, solo los más relevantes para entender la aplicación.

### Auth
- `POST /api/auth/register`: registro de cliente
- `POST /api/auth/register-barbershop`: registro de barbería + owner
- `POST /api/auth/login`: inicio de sesión
- `POST /api/auth/forgot-password`: solicitar recuperación
- `POST /api/auth/reset-password`: cambiar contraseña con token

### Bookings
- `POST /api/bookings`: crear reserva cliente
- `POST /api/bookings/for-client`: crear reserva desde staff
- `POST /api/bookings/walk-in`: crear reserva presencial
- `POST /api/bookings/repeat`: repetir reserva
- `GET /api/bookings/availability`: consultar slots
- `GET /api/bookings/recommendation`: recomendar barbero
- `GET /api/bookings`: listar reservas según rol
- `PATCH /api/bookings/:id`: actualizar estado o datos
- `PATCH /api/bookings/:id/change-barber`: cambiar barbero de una reserva
- `PUT /api/bookings/:id/cancel`: cancelar reserva del cliente

### Admin
- `GET /api/admin/dashboard`: estadísticas generales
- `GET /api/admin/top-barbers`: ranking de barberos
- `GET /api/admin/monthly-data`: datos mensuales
- `GET /api/admin/users`: listar usuarios
- `GET /api/admin/barbershops`: listar barberías
- `GET /api/admin/barbers/diagnostics`: diagnóstico operativo de barberos
- `POST /api/admin/users`: crear usuario
- `PUT /api/admin/users/:id`: actualizar usuario
- `DELETE /api/admin/users/:id`: eliminar usuario

### Users
- perfil del usuario;
- favoritos;
- listados generales según permisos.

### Barbershops
- listar barberías;
- obtener barbería;
- editar barbería;
- consultar servicios de barbería.

### Services
- obtener servicios disponibles para reserva;
- gestionar servicios personalizados;
- gestionar catálogo de barbería.

### Availability
- crear bloqueos;
- listar bloqueos;
- editar bloqueos;
- eliminar bloqueos.

### Barbers
- listar barberos;
- consultar clientes del barbero;
- consultar servicios del barbero;
- consultar ubicaciones operativas.

## 9. Paneles y Pantallas del Frontend
La aplicación enruta por rol desde `src/App.tsx`.

### Pantallas públicas
- `/`: landing principal
- `/auth`: login/registro
- `/register-barbershop`: alta de barbería con owner
- `/reset-password`: recuperación

### Dashboard por rol
#### Cliente
Ve panel orientado a:
- reservar;
- ver citas;
- repetir;
- cancelar;
- favoritos;
- historial.

#### Barbero
Ve panel orientado a:
- agenda;
- servicios;
- clientes;
- reseñas.

#### Admin / Owner
Comparten panel administrativo con foco en:
- barberías;
- usuarios;
- reservas;
- reportes;
- diagnóstico.

### Otras pantallas clave
- `/book`: reserva guiada
- `/appointments`: citas del usuario
- `/barbers`: listado de barberos
- `/profile`: perfil
- `/schedule`: agenda del barbero
- `/services`: servicios
- `/clients`: clientes
- `/reviews`: reseñas

### Pantallas núcleo operativo
Las más importantes para el funcionamiento real son:
- reserva;
- agenda;
- gestión de barberías;
- gestión de usuarios;
- gestión de reservas;
- servicios;
- diagnóstico admin.

### Pantallas complementarias
Apoyan la experiencia, pero no son el centro del negocio:
- perfil;
- listados generales;
- reseñas;
- favoritos.

## 10. Procesos Automáticos y Tareas Operativas

### Recordatorios programados
Se ejecutan con un script que:
- busca reservas próximas;
- verifica ventanas de recordatorio;
- evita campañas duplicadas;
- encola notificaciones.

### Procesamiento de cola
Se ejecuta con:
- worker automático opcional;
- script manual para procesar jobs pendientes.

### Scripts de soporte
El proyecto ya incluye scripts para:
- inicialización de base;
- bootstrap de compatibilidad;
- backfill de clientes por barbería;
- backfill u operaciones de servicios;
- recordatorios;
- procesamiento de la cola.

### Cuándo se usan
- al instalar o estabilizar la base;
- al migrar datos;
- al correr recordatorios periódicos;
- al procesar la cola en segundo plano.

## 11. Problemas Conocidos y Consideraciones Operativas
Estas son consideraciones importantes del estado actual del sistema.

### 1. No existe una suite formal completa de tests automatizados
El proyecto se valida principalmente con:
- build;
- tipado;
- revisión manual;
- chequeos puntuales.

### 2. La disponibilidad real depende de la configuración correcta del barbero
Si un barbero no tiene:
- servicios activos;
- precios activos;
- horario configurado;

puede no aparecer como opción útil en reserva.

### 3. La cola de notificaciones necesita un scheduler o worker activo
Si no se procesa:
- los jobs quedan en `pending`;
- no salen emails ni WhatsApp.

### 4. Existen consideraciones de datos legacy
Como la aplicación evolucionó, algunas estructuras antiguas pueden requerir:
- scripts de compatibilidad;
- backfills;
- evitar `sequelize.sync()` automático sobre una base viva.

### 5. Hay pantallas o bloques aún no completamente productizados
Algunas rutas del frontend siguen siendo informativas o placeholders en comparación con los módulos principales.

## 12. Resumen Rápido del Sistema
```text
Frontend React
-> autentica al usuario
-> muestra dashboard según rol
-> guía al cliente en la reserva
-> permite operar agenda, servicios, clientes y administración

Backend Express
-> valida permisos y reglas
-> calcula disponibilidad real
-> crea reservas y cambios de estado
-> aísla la operación por barbería
-> genera jobs de notificación

PostgreSQL
-> guarda operación y relaciones principales

NotificationJobs
-> procesa recordatorios y confirmaciones
-> reintenta si falla
```

En términos simples:

- el cliente reserva;
- el backend valida;
- la agenda se actualiza;
- la barbería y el barbero reciben notificación;
- el admin supervisa operación, configuración y personal.

---

Documento basado en la implementación actual del proyecto y preparado como guía funcional para operación, producto y mantenimiento técnico.
