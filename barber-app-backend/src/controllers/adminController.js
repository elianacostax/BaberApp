const Booking = require("../models/Booking");
const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const { DateTime } = require("luxon");

const getDashboardStats = async (req, res) => {
    try {
        const { from, to, barbershopId, barberId } = req.query;

        const filters = {};

        // Filtro por fechas
        if (from || to) {
            filters.date = {};
            if (from) {
                filters.date.$gte = DateTime.fromISO(from).toISODate();
            }
            if (to) {
                filters.date.$lte = DateTime.fromISO(to).toISODate();
            }
        }

        // Filtro por barbería
        if (barbershopId) {
            filters.barbershop = barbershopId;
        }

        // Filtro por barbero
        if (barberId) {
            filters.barber = barberId;
        }

        // Obtener todas las reservas que cumplen los filtros
        const bookings = await Booking.find(filters);

        // Total de reservas por día
        const bookingsPerDay = {};
        const bookingsPerBarber = {};
        const bookingsPerBarbershop = {};
        const timeFrequency = {};
        let estimatedRevenue = 0;

        bookings.forEach((booking) => {
            const { date, barber, barbershop, startTime, servicePrice, status } = booking;

            // Validaciones básicas
            if (!date || !barber || !barbershop || !startTime) return;

            const validDate = DateTime.fromISO(date);
            if (!validDate.isValid) return;

            const day = validDate.toISODate(); // YYYY-MM-DD
            const barberIdStr = barber?._id?.toString?.() || barber?.toString?.() || "unknown";
            const barbershopIdStr = barbershop?._id?.toString?.() || barbershop?.toString?.() || "unknown";

            // Total por día
            bookingsPerDay[day] = (bookingsPerDay[day] || 0) + 1;

            // Por barbero
            bookingsPerBarber[barberIdStr] = (bookingsPerBarber[barberIdStr] || 0) + 1;

            // Por barbería
            bookingsPerBarbershop[barbershopIdStr] = (bookingsPerBarbershop[barbershopIdStr] || 0) + 1;

            // Hora más reservada
            if (startTime && !isNaN(startTime.getTime())) {
                const hour = DateTime.fromJSDate(startTime).toFormat("HH:mm");
                timeFrequency[hour] = (timeFrequency[hour] || 0) + 1;
            }

            // Ganancias estimadas
            if (status !== "cancelled") {
                estimatedRevenue += typeof servicePrice === "number" ? servicePrice : 0;
            }
        });

        return res.json({
            totalBookings: bookings.length,
            bookingsPerDay,
            bookingsPerBarber,
            bookingsPerBarbershop,
            timeFrequency,
            estimatedRevenue,
        });
    } catch (err) {
        handleError(res, 'Error al obtener estadísticas', 500, err);
    }
};




module.exports = { getDashboardStats };