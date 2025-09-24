const Barbershop = require("../models/Barbershop");
const AvailabilityBlock = require("../models/AvailabilityBlock");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const Booking = require('../models/Booking')
const { DateTime } = require('luxon')
const { Interval } = require('luxon');




//Verficar disponibilidad de agenda

const isAvailable = async (barbershop, date, time) => {
    const booking = await Booking.findOne({ barbershop: barbershop, date, time });
    return !booking;
};



//Crear una reserva
const createBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { barbershop, barber, serviceId, date, time } = req.body;

        if (!barbershop || !barber || !serviceId || !date || !time) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }

        // Validar que la fecha sea futura
        const requestedDate = DateTime.fromISO(date);
        if (requestedDate < DateTime.now().startOf('day')) {
            return res.status(400).json({ message: "No se pueden hacer reservas en fechas pasadas" });
        }

        // Buscar barbería y servicio
        const barbershopData = await Barbershop.findById(barbershop);
        if (!barbershopData) return res.status(404).json({ message: "Barbería no encontrada" });

        const selectedService = barbershopData.services.id(serviceId);
        if (!selectedService) return res.status(404).json({ message: "Servicio no encontrado en esta barbería" });

        // Validar barbero
        const dataBarber = await User.findById(barber);
        if (!dataBarber || dataBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const { name: serviceName, duration, price } = selectedService;


        // Calcular tiempos
        const localStart = DateTime.fromISO(`${date}T${time}`, { zone: 'America/Bogota' });
        if (!localStart.isValid) return res.status(400).json({ message: "Fecha u hora inválida" });

        const localEnd = localStart.plus({ minutes: selectedService.duration });
        const startTime = localStart.toUTC().toJSDate();
        const endTime = localEnd.toUTC().toJSDate();

        // Validar bloqueos de disponibilidad del barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            barber: barber,
            start: { $lt: endTime },
            end: { $gt: startTime }
        });

        if (overlappingBlock) {
            return res.status(400).json({
                message: `No se puede crear la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
            });
        }
        // Validar horario de apertura de la barbería
        const { openHour, closeHour } = barbershopData.openingHours;
        if (
            localStart.hour < openHour ||
            localEnd.hour > closeHour ||
            (localEnd.hour === closeHour && localEnd.minute > 0)
        ) {
            return res.status(400).json({
                message: `La reserva debe estar entre las ${String(openHour).padStart(2, '0')}:00 y las ${String(closeHour).padStart(2, '0')}:00`
            });
        }

        // Validar solapamiento
        const overlappingBooking = await Booking.findOne({
            barber,
            date,
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "Ya existe una reserva en este rango de tiempo" });
        }

        // Validar horario del barbero
        const barberData = await User.findById(barber);
        if (!barberData || barberData.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const dayOfWeek = localStart.toFormat("cccc").toLowerCase();
        const barberSchedule = barberData.schedule?.get(dayOfWeek);
        if (!barberSchedule || !barberSchedule.start || !barberSchedule.end) {
            return res.status(400).json({ message: `El barbero no trabaja los días ${dayOfWeek}` });
        }

        const [startHour, startMinute] = barberSchedule.start.split(":").map(Number);
        const [endHour, endMinute] = barberSchedule.end.split(":").map(Number);
        const barberStart = localStart.set({ hour: startHour, minute: startMinute });
        const barberEnd = localStart.set({ hour: endHour, minute: endMinute });

        if (localStart < barberStart || localEnd > barberEnd) {
            return res.status(400).json({
                message: `El barbero solo trabaja entre ${barberSchedule.start} y ${barberSchedule.end}`
            });
        }

        // Crear reserva
        const booking = new Booking({
            user: userId,
            barber,
            barbershop,
            date,
            time,
            startTime,
            endTime,
            serviceName: selectedService.name,
            servicePrice: selectedService.price,
            serviceDuration: selectedService.duration,
            status: "pending"
        });

        await booking.save();

        // Población de datos para respuesta
        await booking.populate([
            { path: 'barber', select: 'name' },
            { path: 'barbershop', select: 'name address' }
        ]);

        res.status(201).json({ message: "Reserva creada correctamente", booking });

    } catch (err) {
        handleError(res, 'Error al crear la reserva', 500, err);
    }
};

//Repetir reserva
const repeatBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { originalBookingId, newDate, newTime } = req.body;

        if (!originalBookingId || !newDate || !newTime) {
            return res.status(400).json({ message: "Faltan datos: reserva original, nueva fecha y hora son requeridos" });
        }

        const originalBooking = await Booking.findById(originalBookingId);
        if (!originalBooking) {
            return res.status(404).json({ message: "Reserva original no encontrada" });
        }

        if (originalBooking.user.toString() !== userId) {
            return res.status(403).json({ message: "No tienes permiso para repetir esta reserva" });
        }

        // Verificar existencia del barbero y barbería
        const barber = await User.findById(originalBooking.barber);
        const barbershop = await Barbershop.findById(originalBooking.barbershop);

        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no disponible" });
        }

        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no disponible" });
        }

        // Validar horario del servicio
        const localStart = DateTime.fromISO(`${newDate}T${newTime}`, { zone: "America/Bogota" });
        if (!localStart.isValid) {
            return res.status(400).json({ message: "Fecha u hora inválida" });
        }

        const localEnd = localStart.plus({ minutes: originalBooking.serviceDuration });
        const startTime = localStart.toUTC().toJSDate();
        const endTime = localEnd.toUTC().toJSDate();

        // Validar bloqueos de disponibilidad del barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            barber: originalBooking.barber,
            start: { $lt: endTime },
            end: { $gt: startTime }
        });

        if (overlappingBlock) {
            return res.status(400).json({
                message: `No se puede repetir la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
            });
        }

        // Validar solapamientos
        const overlapping = await Booking.findOne({
            barber: originalBooking.barber,
            date: newDate,
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({ message: "Ya existe una reserva en ese rango de tiempo" });
        }

        // Crear nueva reserva
        const newBooking = new Booking({
            user: userId,
            barber: originalBooking.barber,
            barbershop: originalBooking.barbershop,
            date: newDate,
            time: newTime,
            startTime,
            endTime,
            serviceName: originalBooking.serviceName,
            servicePrice: originalBooking.servicePrice,
            serviceDuration: originalBooking.serviceDuration,
            status: "pending"
        });

        await newBooking.save();

        res.status(201).json({ message: "Reserva repetida correctamente", booking: newBooking });

    } catch (err) {
        handleError(res, 'Error al repetir la reserva', 500, err);
    }
};

//Consultar reservas
const getAllBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { date } = req.query;

        // Construimos el filtro base
        const query = {};


        // Filtro por rol
        if (role === 'barber') {
            query.barber = userId;
        } else {
            query.user = userId;
        }

        // Filtro por fecha (si se proporciona)
        if (date) {
            query.date = date;
        }


        // Consulta
        const bookings = await Booking.find(query)
            .populate('user', 'name')
            .populate('barber', 'name')
            .populate('barbershop', 'name');

        res.status(200).json(bookings);
    } catch (err) {
        handleError(res, 'Error al obtener reservas', 500, err);
    }
};

// Obtener reservas del cliente (futuras y pasadas)
const getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = "upcoming" } = req.query;

        const today = DateTime.now().toISODate();

        let filter = { user: userId };

        if (type === "upcoming") {
            filter.date = { $gte: today };
        } else if (type === "past") {
            filter.date = { $lt: today };
        }

        const bookings = await Booking.find(filter)
            .sort({ date: type === "upcoming" ? 1 : -1 })
            .populate("barber", "name")
            .populate("barbershop", "name");

        res.json({ bookings });
    } catch (err) {
        handleError(res, 'Error al obtener reservas', 500, err);
    }
};

//Consultar agenda diaria  y semanal de un barbero
const getBarberAgenda = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { date, type = "day" } = req.query;

        if (!date) {
            return res.status(400).json({ message: "La fecha es obligatoria con el formato YYYY-MM-DD" })
        }

        // Validar tipo de consulta
        const validTypes = ["day", "week"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: "El parámetro 'type' debe ser 'day' o 'week'" });
        }

        const parseDate = DateTime.fromISO(date, { zone: "America/Bogota" });
        if (!parseDate.isValid) {
            return res.status(400).json({ message: "Formato  de fecha invalido" });
        }

        let query = { barber: barberId };

        if (type === "week") {
            const startOfWeek = DateTime.fromISO(date).startOf('week').plus({ days: 1 }); // lunes
            const endOfWeek = startOfWeek.plus({ days: 6 }); // domingo
            query.date = { $gte: startOfWeek.toISODate(), $lte: endOfWeek.toISODate() };
        } else {
            query.date = parseDate.toISODate();
        }
        console.log("Buscando con query:", query);
        const bookings = await Booking.find(query)
            .sort({ startTime: 1 })
            .populate("user", "name email")
            .populate("barbershop", "name");

        res.status(200).json({ agenda: bookings });
    } catch (error) {
        console.error(error);
        handleError(res, 'Error al obtener la agenda del barbero', 500, error);
    }
}

//Cancelar o modificar una reserva
const VALID_STATUSES = Booking.schema.path("status").enumValues;

const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Estado no valido" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no econtrada" })
        }

        //Validacion de permisos para los roles
        const userId = req.user.id;
        const userRole = req.user.role;

        const isOwner = booking.user.toString() === userId;
        const isBarber = booking.barber.toString() === userId;
        const isAdmin = userRole === 'admin';

        console.log(req.user);

        if (!isOwner && !isBarber && !isAdmin) {
            return res.status(403).json({ message: "No tienes permisos para modificar esta reserva" });
        }
        // Solo admin y barbero pueden marcar como completed
        if (status === "completed" && !isBarber && !isAdmin) {
            return res.status(403).json({ message: "Solo el barbero o admin puede marcar como completada" });
        }
        //Restriccion de no modificar reserva ya cancelada
        if (booking.status === "cancelled") {
            return res.status(400).json({ message: "No se puede modificar una reserva cancelada" });
        }

        if (booking.status === "completed" && status !== "completed") {
            return res.status(400).json({ message: "No se puede revertir una reserva completada" });
        }

        booking.status = status;
        await booking.save();

        res.json({ message: "Estado actualizado", booking });
    } catch (err) {
        handleError(res, 'Error al actualizar', 500, err);
    }
};

//Usuario cancela reserva desde el panel usuario
const cancelBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        if (booking.user.toString() !== userId) {
            return res.status(403).json({ message: "No autorizado para cancelar esta reserva" });
        }

        if (["cancelled", "completed"].includes(booking.status)) {
            return res.status(400).json({ message: "No se puede cancelar esta reserva" });
        }

        booking.status = "cancelled";
        await booking.save();

        res.json({ message: "Reserva cancelada correctamente", booking });
    } catch (err) {
        handleError(res, 'Error al cancelar la reserva', 500, err);
    }
};

//Eliminar reserva (solo admin)
const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;

        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Solo un administrador puede eliminar reservas" });
        }

        const booking = await Booking.findByIdAndDelete(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        res.json({ message: "Reserva eliminada correctamente" });
    } catch (err) {
        handleError(res, 'Error al eliminar la reserva', 500, err);
    }
}

const getAvailableSlots = async (req, res) => {
    try {
        const { barbershopId, barberId, serviceId, date } = req.query;

        console.log("📅 Fecha solicitada:", date);
        console.log("🏪 Barbería:", barbershopId);
        console.log("💈 Barbero:", barberId);
        console.log("🔧 Servicio:", serviceId);

        const dayOfWeek = DateTime.fromISO(date).weekday % 7;

        // 1. Validar barbería y servicio
        const barbershop = await Barbershop.findById(barbershopId);
        if (!barbershop) return res.status(404).json({ message: "Barbería no encontrada" });

        const service = barbershop?.services?.id(serviceId);
        if (!service) return res.status(404).json({ message: "Servicio no encontrado" });

        const serviceDuration = service.duration;

        // 2. Obtener horario del barbero
        const barber = await User.findById(barberId);
        const schedule = barber?.schedule;
        const workingHours = schedule?.get(dayOfWeek.toString());

        if (!workingHours || !workingHours.start || !workingHours.end) {
            return res.json({ availableSlots: [] });
        }

        // 3. Construir slots posibles
        const startTime = DateTime.fromISO(`${date}T${workingHours.start}`);
        const endTime = DateTime.fromISO(`${date}T${workingHours.end}`);
        const allSlots = [];

        let current = startTime;
        while (current.plus({ minutes: serviceDuration }) <= endTime) {
            allSlots.push({
                start: current.toISO(),
                end: current.plus({ minutes: serviceDuration }).toISO(),
            });
            current = current.plus({ minutes: serviceDuration });
        }

        // 4. Obtener reservas existentes en ese día
        const dayStart = startTime.startOf("day");
        const dayEnd = startTime.endOf("day");

        const bookings = await Booking.find({
            barber: barberId,
            date,
        });

        const reservedIntervals = bookings.map(b =>
            Interval.fromDateTimes(DateTime.fromJSDate(b.startTime), DateTime.fromJSDate(b.endTime))
        );

        // 5. Obtener bloqueos del barbero en ese día
        const blocks = await AvailabilityBlock.find({
            $or: [
                { appliesToAllBarbers: true },
                { barber: barberId }
            ],
            start: { $lt: dayEnd.toJSDate() },
            end: { $gt: dayStart.toJSDate() }
        });

        const blockedIntervals = blocks.map(b =>
            Interval.fromDateTimes(DateTime.fromJSDate(b.start), DateTime.fromJSDate(b.end))
        );

        // 6. Filtrar slots disponibles
        const availableSlots = allSlots.filter(slot => {
            const slotInterval = Interval.fromDateTimes(DateTime.fromISO(slot.start), DateTime.fromISO(slot.end));
            const overlapsReservation = reservedIntervals.some(r => r.overlaps(slotInterval));
            const overlapsBlock = blockedIntervals.some(b => b.overlaps(slotInterval));
            return !overlapsReservation && !overlapsBlock;
        });

        return res.json({ availableSlots });

    } catch (err) {
        handleError(res, 'Error al obtener slots disponibles', 500, err);
    }
};

//Obtener historial de reserva
const getMyReservations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = "upcoming" } = req.query;

        const today = DateTime.now().startOf('day');
        const query = { user: userId };

        if (type === "upcoming") {
            query.$or = [
                { status: { $in: ["pending", "confirmed"] }, date: { $gte: today.toISODate() } }
            ];
        } else if (type === "past") {
            query.$or = [
                { status: { $in: ["completed", "cancelled"] } },
                { date: { $lt: today.toISODate() } }
            ];
        }

        const bookings = await Booking.find(query)
            .sort({ date: type === "past" ? -1 : 1 })
            .populate("barber", "name")
            .populate("barbershop", "name");

        res.json({ bookings });
    } catch (err) {
        handleError(res, 'Error al obtener historial de reservas', 500, err);
    }
};

module.exports = { createBooking, repeatBooking, getAvailableSlots, getBarberAgenda, getUserBookings, updateBookingStatus, getAllBookings, deleteBooking, getMyReservations, cancelBooking };