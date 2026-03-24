const express = require("express");
const router = express.Router();
const { createBooking, repeatBooking, getAvailableSlots, getRecommendedBarber, getBarberAgenda, getUserBookings, updateBookingStatus, getAllBookings, deleteBooking, cancelBooking, getMyReservations, createBookingForClient, changeBookingBarber, getBookingsWithAutoUpdate, getBookingStats, createWalkInBooking } = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateSchema, schemas } = require("../middlewares/validateBody");
const { bookingLimiter, staffBookingLimiter } = require("../middlewares/rateLimiter");




// Crear nueva reserva (cliente)
router.post("/", protect, bookingLimiter, validateSchema(schemas.bookingCreate), createBooking);

// Crear reserva como barbero/admin para un cliente
router.post("/for-client", protect, authorizeRoles("barber", "admin", "owner"), staffBookingLimiter, validateSchema(schemas.bookingCreateForClient), createBookingForClient);

// Crear reserva walk-in (cliente no registrado)
router.post("/walk-in", protect, authorizeRoles("barber", "admin", "owner"), staffBookingLimiter, createWalkInBooking);

//Repetir reserva
router.post("/repeat", protect, authorizeRoles("client"), bookingLimiter, validateSchema(schemas.bookingRepeat), repeatBooking);

// Obtener agenda de un barbero
router.get("/barber/agenda", protect, authorizeRoles("barber"), getBarberAgenda);


//Obtener todas las reservas
router.get('/', protect, getAllBookings);

//Obtener reservas con actualización automática
router.get('/auto-update', protect, getBookingsWithAutoUpdate);

//Obtener estadísticas generales de reservas
router.get('/stats', protect, getBookingStats);

//Obtener reservas usuario
router.get("/my-bookings", protect, getUserBookings);

// ✅ Actualizar estado de la reserva (admin o barbero)
router.patch("/:id", protect, validateSchema(schemas.bookingStatusUpdate), updateBookingStatus);

// ✅ Cambiar barbero de una reserva (solo admin)
router.patch("/:id/change-barber", protect, authorizeRoles("admin", "owner"), validateSchema(schemas.bookingChangeBarber), changeBookingBarber);

//Eliminar reservas, solo admin
router.delete('/:id', protect, authorizeRoles("admin", "owner"), deleteBooking);

//Consultar disponibildad
router.get('/availability', getAvailableSlots);
router.get('/recommendation', getRecommendedBarber);

//Consulta histporico de reservas
router.get('/my-reservations', protect, getMyReservations);

// ✅ Cancelar una reserva (cliente)
router.put('/:id/cancel', protect, cancelBooking);


module.exports = router;
