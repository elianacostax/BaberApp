const express = require("express");
const router = express.Router();
const { createBooking, repeatBooking, getAvailableSlots, getBarberAgenda, getUserBookings, updateBookingStatus, getAllBookings, deleteBooking, cancelBooking, getMyReservations, getBarberStats, createBookingForClient, changeBookingBarber, getBookingsWithAutoUpdate, getBookingStats } = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateBody, validateSchema, schemas } = require("../middlewares/validateBody");




// Crear nueva reserva (cliente)
router.post("/", protect, validateSchema(schemas.bookingCreate), createBooking);

// Crear reserva como barbero/admin para un cliente
router.post("/for-client", protect, authorizeRoles("barber", "admin"), validateSchema(schemas.bookingCreateForClient), createBookingForClient);

//Repetir reserva
router.post("/repeat", protect, authorizeRoles("client"), validateSchema(schemas.bookingRepeat), repeatBooking);

// Obtener agenda de un barbero
router.get("/barber/agenda", protect, authorizeRoles("barber"), getBarberAgenda);

// Obtener estadísticas del barbero
router.get("/barber/stats", protect, authorizeRoles("barber"), getBarberStats);  

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
router.patch("/:id/change-barber", protect, authorizeRoles("admin"), validateSchema(schemas.bookingChangeBarber), changeBookingBarber);

//Eliminar reservas, solo admin
router.delete('/:id', protect, authorizeRoles("admin"), deleteBooking);

//Consultar disponibildad
router.get('/availability', protect, getAvailableSlots);

//Consulta histporico de reservas
router.get('/my-reservations', protect, getMyReservations);

// ✅ Cancelar una reserva (cliente)
router.put('/:id/cancel', protect, cancelBooking);


module.exports = router;