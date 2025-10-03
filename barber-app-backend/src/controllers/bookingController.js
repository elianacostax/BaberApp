const Barbershop = require("../models/Barbershop");
const AvailabilityBlock = require("../models/AvailabilityBlock");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const Booking = require('../models/Booking')
const { DateTime } = require('luxon')
const { Interval } = require('luxon');

// Helper function para obtener servicio y precio
const getServiceAndPrice = async (serviceId, barberId, barbershopId) => {
    const barbershop = await Barbershop.findById(barbershopId);
    const barber = await User.findById(barberId);
    
    if (!barbershop || !barber) {
        throw new Error("Barbería o barbero no encontrado");
    }

    // Buscar servicio en barbería primero
    let service = barbershop.services.id(serviceId);
    let serviceSource = 'barbershop';
    let price = service?.price;

    if (!service) {
        // Buscar en servicios personalizados del barbero
        service = barber.customServices.id(serviceId);
        serviceSource = 'custom';
        price = service?.price;
    }

    if (!service) {
        throw new Error("Servicio no encontrado");
    }

    // Si es servicio de barbería, verificar precio personalizado
    if (serviceSource === 'barbershop') {
        const customPrice = barber.customPrices.get(serviceId);
        if (customPrice && customPrice.isActive) {
            price = customPrice.price;
        }
    }

    return {
        service,
        price,
        serviceSource
    };
};




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

        // Validar barbero
        const dataBarber = await User.findById(barber);
        if (!dataBarber || dataBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Validar barbería
        const barbershopData = await Barbershop.findById(barbershop);
        if (!barbershopData) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        // Obtener servicio y precio usando la función helper
        try {
            const { service: selectedService, price: servicePrice, serviceSource } = await getServiceAndPrice(serviceId, barber, barbershop);
            const { name: serviceName, duration } = selectedService;
            const price = servicePrice;


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

        // Usar índice numérico del día (Mon=1..Sun=7) y normalizar a 0..6 (Sun=0)
        const dayIndex = localStart.weekday % 7; // 0..6
        const barberSchedule = barberData.schedule?.get(dayIndex.toString());
        if (!barberSchedule || !barberSchedule.start || !barberSchedule.end) {
            return res.status(400).json({ message: `El barbero no trabaja ese día` });
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
                servicePrice: price,
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

        } catch (serviceError) {
            return res.status(404).json({ message: serviceError.message });
        }

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
        if (role === 'admin') {
            // Admin ve todo, sin filtro por usuario
        } else if (role === 'barber') {
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
            return res.status(400).json({ message: "Estado no válido" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" })
        }

        //Validacion de permisos para los roles
        const userId = req.user.id;
        const userRole = req.user.role;

        const isOwner = booking.user.toString() === userId;
        const isBarber = booking.barber.toString() === userId;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isBarber && !isAdmin) {
            return res.status(403).json({ message: "No tienes permisos para modificar esta reserva" });
        }

        // Validaciones de transiciones de estado
        const currentStatus = booking.status;
        const newStatus = status;

        // Validar transiciones válidas
        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['completed', 'cancelled'],
            'cancelled': [], // No se puede cambiar desde cancelado
            'completed': [] // No se puede cambiar desde completado
        };

        if (!validTransitions[currentStatus].includes(newStatus)) {
            return res.status(400).json({ 
                message: `No se puede cambiar el estado de '${currentStatus}' a '${newStatus}'` 
            });
        }

        // Validaciones específicas por rol
        if (newStatus === "completed" && !isBarber && !isAdmin) {
            return res.status(403).json({ message: "Solo el barbero o admin puede marcar como completada" });
        }

        if (newStatus === "confirmed" && !isBarber && !isAdmin) {
            return res.status(403).json({ message: "Solo el barbero o admin puede confirmar una reserva" });
        }

        // Validar que no se pueda cancelar una reserva muy próxima (menos de 2 horas)
        if (newStatus === "cancelled") {
            const bookingDateTime = DateTime.fromISO(`${booking.date}T${booking.time}`, { zone: 'America/Bogota' });
            const now = DateTime.now().setZone('America/Bogota');
            const timeDiff = bookingDateTime.diff(now, 'hours').hours;

            if (timeDiff < 2 && !isAdmin) {
                return res.status(400).json({ 
                    message: "No se puede cancelar una reserva con menos de 2 horas de anticipación" 
                });
            }
        }

        // Actualizar estado y registrar quién lo modificó
        booking.status = newStatus;
        booking.modifiedBy = userId;
        await booking.save();

        // Población de datos para respuesta
        await booking.populate([
            { path: 'user', select: 'name email' },
            { path: 'barber', select: 'name' },
            { path: 'barbershop', select: 'name address' }
        ]);

        res.json({ 
            message: `Estado actualizado a '${newStatus}' correctamente`, 
            booking,
            previousStatus: currentStatus,
            newStatus: newStatus
        });
    } catch (err) {
        handleError(res, 'Error al actualizar estado de la reserva', 500, err);
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

        // Validar que no se pueda cancelar una reserva muy próxima (menos de 2 horas)
        const bookingDateTime = DateTime.fromISO(`${booking.date}T${booking.time}`, { zone: 'America/Bogota' });
        const now = DateTime.now().setZone('America/Bogota');
        const timeDiff = bookingDateTime.diff(now, 'hours').hours;

        if (timeDiff < 2) {
            return res.status(400).json({ 
                message: "No se puede cancelar una reserva con menos de 2 horas de anticipación. Contacta al barbero o administrador." 
            });
        }

        booking.status = "cancelled";
        booking.modifiedBy = userId;
        await booking.save();

        // Población de datos para respuesta
        await booking.populate([
            { path: 'user', select: 'name email' },
            { path: 'barber', select: 'name' },
            { path: 'barbershop', select: 'name address' }
        ]);

        res.json({ 
            message: "Reserva cancelada correctamente", 
            booking,
            cancelledAt: new Date().toISOString()
        });
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

// Obtener estadísticas del barbero
const getBarberStats = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { date, type = 'day' } = req.query;
        
        let startDate, endDate;
        
        if (type === 'day') {
            startDate = new Date(date);
            endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
        } else if (type === 'week') {
            const targetDate = new Date(date);
            const dayOfWeek = targetDate.getDay();
            const diff = targetDate.getDate() - dayOfWeek;
            startDate = new Date(targetDate.setDate(diff));
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
        }

        // Estadísticas básicas
        const totalAppointments = await Booking.countDocuments({
            barber: barberId,
            date: { $gte: startDate, $lt: endDate }
        });

        const completedAppointments = await Booking.countDocuments({
            barber: barberId,
            date: { $gte: startDate, $lt: endDate },
            status: 'completed'
        });

        const pendingAppointments = await Booking.countDocuments({
            barber: barberId,
            date: { $gte: startDate, $lt: endDate },
            status: 'confirmed'
        });

        const cancelledAppointments = await Booking.countDocuments({
            barber: barberId,
            date: { $gte: startDate, $lt: endDate },
            status: 'cancelled'
        });

        // Ingresos totales
        const revenueResult = await Booking.aggregate([
            {
                $match: {
                    barber: barberId,
                    date: { $gte: startDate, $lt: endDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$servicePrice' }
                }
            }
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Calificación promedio (necesitaríamos un endpoint de reviews)
        const averageRating = 4.5; // Placeholder - se implementaría con reviews

        // Si es tipo 'week', devolver datos por día
        if (type === 'week') {
            const weeklyData = [];
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            
            for (let i = 0; i < 7; i++) {
                const dayStart = new Date(startDate);
                dayStart.setDate(dayStart.getDate() + i);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                
                const dayAppointments = await Booking.countDocuments({
                    barber: barberId,
                    date: { $gte: dayStart, $lt: dayEnd }
                });
                
                const dayRevenue = await Booking.aggregate([
                    {
                        $match: {
                            barber: barberId,
                            date: { $gte: dayStart, $lt: dayEnd },
                            status: 'completed'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: '$servicePrice' }
                        }
                    }
                ]);
                
                weeklyData.push({
                    day: days[i],
                    appointments: dayAppointments,
                    revenue: dayRevenue.length > 0 ? dayRevenue[0].revenue : 0
                });
            }
            
            return res.json(weeklyData);
        }

        res.json({
            totalAppointments,
            completedAppointments,
            pendingAppointments,
            cancelledAppointments,
            totalRevenue,
            averageRating
        });
    } catch (err) {
        handleError(res, 'Error al obtener estadísticas del barbero', 500, err);
    }
};

// Crear reserva como barbero o admin (para clientes)
const createBookingForClient = async (req, res) => {
    try {
        const staffId = req.user.id;
        const staffRole = req.user.role;
        const { userId, barbershop, barber, serviceId, date, time } = req.body;

        // Validar que sea barbero o admin
        if (!['barber', 'admin'].includes(staffRole)) {
            return res.status(403).json({ message: "Solo barberos y administradores pueden crear reservas para clientes" });
        }

        if (!userId || !barbershop || !barber || !serviceId || !date || !time) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }

        // Validar que la fecha sea futura
        const requestedDate = DateTime.fromISO(date);
        if (requestedDate < DateTime.now().startOf('day')) {
            return res.status(400).json({ message: "No se pueden hacer reservas en fechas pasadas" });
        }

        // Validar barbero
        const dataBarber = await User.findById(barber);
        if (!dataBarber || dataBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Validar cliente
        const clientData = await User.findById(userId);
        if (!clientData || clientData.role !== 'client') {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        // Validar barbería
        const barbershopData = await Barbershop.findById(barbershop);
        if (!barbershopData) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        // Obtener servicio y precio usando la función helper
        try {
            const { service: selectedService, price: servicePrice, serviceSource } = await getServiceAndPrice(serviceId, barber, barbershop);
            const { name: serviceName, duration } = selectedService;
            const price = servicePrice;

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
        const dayIndex = localStart.weekday % 7; // 0..6
        const barberSchedule = dataBarber.schedule?.get(dayIndex.toString());
        if (!barberSchedule || !barberSchedule.start || !barberSchedule.end) {
            return res.status(400).json({ message: `El barbero no trabaja ese día` });
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
                servicePrice: price,
                serviceDuration: selectedService.duration,
                status: "confirmed", // Confirmada automáticamente cuando la crea el staff
                createdBy: staffId // Campo para rastrear quién creó la reserva
            });

            await booking.save();

            // Población de datos para respuesta
            await booking.populate([
                { path: 'user', select: 'name email' },
                { path: 'barber', select: 'name' },
                { path: 'barbershop', select: 'name address' }
            ]);

            res.status(201).json({ 
                message: "Reserva creada correctamente para el cliente", 
                booking 
            });

        } catch (serviceError) {
            return res.status(404).json({ message: serviceError.message });
        }

    } catch (err) {
        handleError(res, 'Error al crear la reserva para el cliente', 500, err);
    }
};

// Modificar barbero de una reserva (solo admin)
const changeBookingBarber = async (req, res) => {
    try {
        const { id } = req.params;
        const { newBarberId } = req.body;
        const userRole = req.user.role;

        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Solo los administradores pueden modificar el barbero de una reserva" });
        }

        if (!newBarberId) {
            return res.status(400).json({ message: "El nuevo barbero es obligatorio" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        // Validar que la reserva no esté cancelada o completada
        if (['cancelled', 'completed'].includes(booking.status)) {
            return res.status(400).json({ message: "No se puede modificar el barbero de una reserva cancelada o completada" });
        }

        // Validar nuevo barbero
        const newBarber = await User.findById(newBarberId);
        if (!newBarber || newBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Validar que el nuevo barbero trabaje en la fecha y hora de la reserva
        const localStart = DateTime.fromISO(`${booking.date}T${booking.time}`, { zone: 'America/Bogota' });
        const dayIndex = localStart.weekday % 7;
        const barberSchedule = newBarber.schedule?.get(dayIndex.toString());
        
        if (!barberSchedule || !barberSchedule.start || !barberSchedule.end) {
            return res.status(400).json({ message: `El nuevo barbero no trabaja ese día` });
        }

        const [startHour, startMinute] = barberSchedule.start.split(":").map(Number);
        const [endHour, endMinute] = barberSchedule.end.split(":").map(Number);
        const barberStart = localStart.set({ hour: startHour, minute: startMinute });
        const barberEnd = localStart.set({ hour: endHour, minute: endMinute });

        if (localStart < barberStart || localStart.plus({ minutes: booking.serviceDuration }) > barberEnd) {
            return res.status(400).json({
                message: `El nuevo barbero no está disponible en ese horario`
            });
        }

        // Validar que no haya conflictos con el nuevo barbero
        const overlappingBooking = await Booking.findOne({
            barber: newBarberId,
            date: booking.date,
            _id: { $ne: booking._id }, // Excluir la reserva actual
            $or: [
                { startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime } }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "El nuevo barbero ya tiene una reserva en ese horario" });
        }

        // Validar bloqueos de disponibilidad del nuevo barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            barber: newBarberId,
            start: { $lt: booking.endTime },
            end: { $gt: booking.startTime }
        });

        if (overlappingBlock) {
            return res.status(400).json({
                message: `No se puede asignar al nuevo barbero porque tiene un bloqueo de disponibilidad: ${overlappingBlock.reason}`
            });
        }

        // Actualizar la reserva
        const oldBarberId = booking.barber;
        booking.barber = newBarberId;
        booking.modifiedBy = req.user.id; // Campo para rastrear quién modificó la reserva
        await booking.save();

        // Población de datos para respuesta
        await booking.populate([
            { path: 'user', select: 'name email' },
            { path: 'barber', select: 'name' },
            { path: 'barbershop', select: 'name address' }
        ]);

        res.json({ 
            message: "Barbero de la reserva actualizado correctamente", 
            booking,
            oldBarberId,
            newBarberId
        });

    } catch (err) {
        handleError(res, 'Error al modificar el barbero de la reserva', 500, err);
    }
};

// Obtener reservas con actualización automática (WebSocket simulation)
const getBookingsWithAutoUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { date } = req.query;

        // Construimos el filtro base
        const query = {};

        // Filtro por rol
        if (role === 'admin') {
            // Admin ve todo, sin filtro por usuario
        } else if (role === 'barber') {
            query.barber = userId;
        } else {
            query.user = userId;
        }

        // Filtro por fecha (si se proporciona)
        if (date) {
            query.date = date;
        }

        // Consulta con ordenamiento por fecha de modificación para detectar cambios
        const bookings = await Booking.find(query)
            .populate('user', 'name email')
            .populate('barber', 'name')
            .populate('barbershop', 'name address')
            .sort({ updatedAt: -1, createdAt: -1 });

        // Agregar timestamp para detectar cambios en el frontend
        const response = {
            bookings,
            lastUpdate: new Date().toISOString(),
            totalCount: bookings.length
        };

        res.status(200).json(response);
    } catch (err) {
        handleError(res, 'Error al obtener reservas con actualización automática', 500, err);
    }
};

// Obtener estadísticas generales de reservas (para dashboard)
const getBookingStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { date } = req.query;

        let matchQuery = {};

        // Filtro por rol
        if (role === 'admin') {
            // Admin ve todo
        } else if (role === 'barber') {
            matchQuery.barber = userId;
        } else {
            matchQuery.user = userId;
        }

        // Filtro por fecha si se proporciona
        if (date) {
            matchQuery.date = date;
        }

        const stats = await Booking.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$servicePrice' }
                }
            }
        ]);

        // Formatear estadísticas
        const formattedStats = {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            totalRevenue: 0,
            totalBookings: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            if (stat._id === 'completed') {
                formattedStats.totalRevenue = stat.totalRevenue;
            }
            formattedStats.totalBookings += stat.count;
        });

        res.json({
            stats: formattedStats,
            lastUpdate: new Date().toISOString()
        });

    } catch (err) {
        handleError(res, 'Error al obtener estadísticas de reservas', 500, err);
    }
};

module.exports = { 
    createBooking, 
    repeatBooking, 
    getAvailableSlots, 
    getBarberAgenda, 
    getUserBookings, 
    updateBookingStatus, 
    getAllBookings, 
    deleteBooking, 
    getMyReservations, 
    cancelBooking, 
    getBarberStats,
    createBookingForClient,
    changeBookingBarber,
    getBookingsWithAutoUpdate,
    getBookingStats
};