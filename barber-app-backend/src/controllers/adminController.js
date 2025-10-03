const Booking = require("../models/Booking");
const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { handleError } = require("../utils/errorHandler");
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

// Crear usuario (admin only)
module.exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, barbershop } = req.body;

        // Validar existencia
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "El correo ya está en uso" });

        // Si es barbero y se envía barbería, validar que exista
        if (barbershop) {
            const shop = await Barbershop.findById(barbershop).select('_id');
            if (!shop) return res.status(400).json({ message: "Barbería no válida" });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            ...(barbershop ? { barbershop } : {}),
        });

        // No iniciar sesión; devolver datos creados
        return res.status(201).json({
            user: { id: user._id, name: user.name, email: user.email, role: user.role, barbershop: user.barbershop || null },
        });
    } catch (err) {
        handleError(res, 'Error al crear usuario', 500, err);
    }
};

// Actualizar horario de cualquier barbero (admin)
module.exports.updateBarberSchedule = async (req, res) => {
    try {
        const { barberId } = req.params;
        const { schedule } = req.body;

        const barber = await User.findById(barberId).populate('barbershop');
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: 'Barbero no encontrado' });
        }

        // Validar contra horario de barbería si existe
        if (barber.barbershop) {
            const shop = await Barbershop.findById(barber.barbershop);
            if (shop && shop.openingHours) {
                const { openHour, closeHour } = shop.openingHours;
                for (const [day, hours] of Object.entries(schedule)) {
                    if (!hours || !hours.start || !hours.end) continue;
                    const [sh, sm] = hours.start.split(':').map(Number);
                    const [eh, em] = hours.end.split(':').map(Number);
                    if (sh < openHour || eh > closeHour || (eh === closeHour && em > 0)) {
                        return res.status(400).json({
                            message: `El día ${day} debe estar entre ${String(openHour).padStart(2,'0')}:00 y ${String(closeHour).padStart(2,'0')}:00`
                        });
                    }
                }
            }
        }

        barber.schedule = schedule;
        await barber.save();
        return res.json({ message: 'Horario actualizado', schedule: barber.schedule });
    } catch (err) {
        return res.status(500).json({ message: 'Error al actualizar horario', error: err.message });
    }
};