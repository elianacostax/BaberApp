const Barbershop = require("../models/Barbershop");
const AvailabilityBlock = require("../models/AvailabilityBlock");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const Booking = require('../models/Booking')
const { DateTime } = require('luxon')
const { Interval } = require('luxon');
const { Op } = require("sequelize");

// Helper function para obtener servicio y precio
const getServiceAndPrice = async (serviceId, barberId, barbershopId) => {
    const barbershop = await Barbershop.findByPk(barbershopId);
    const barber = await User.findByPk(barberId);
    
    if (!barbershop || !barber) {
        throw new Error("Barbería o barbero no encontrado");
    }

    // Buscar servicio en barbería primero (services es JSONB)
    const services = barbershop.services || [];
    let service = services.find(s => (s._id && s._id.toString() === serviceId) || (s.id && s.id.toString() === serviceId));
    let serviceSource = 'barbershop';
    let price = service?.price;

    if (service) {
        const customPrices = barber.customPrices || {};
        const customPrice = customPrices[serviceId];
        if (!customPrice || !customPrice.isActive) {
            throw new Error("Servicio no disponible para este barbero");
        }
        price = customPrice.price;
    } else {
        // Buscar en servicios personalizados del barbero (customServices es JSONB)
        const customServices = barber.customServices || [];
        service = customServices.find(s => (s._id && s._id.toString() === serviceId) || (s.id && s.id.toString() === serviceId));
        serviceSource = 'custom';
        price = service?.price;
        if (!service || !service.isActive) {
            throw new Error("Servicio no disponible para este barbero");
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
    const booking = await Booking.findOne({ 
        where: { barbershopId: barbershop, date, time } 
    });
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
        const dataBarber = await User.findByPk(barber);
        if (!dataBarber || dataBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Validar barbería
        const barbershopData = await Barbershop.findByPk(barbershop);
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
            where: {
                barberId: barber,
                start: { [Op.lt]: endTime },
                end: { [Op.gt]: startTime }
            }
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
            where: {
                barberId: barber,
                status: { [Op.in]: ["pending", "confirmed"] },
                startTime: { [Op.lt]: endTime },
                endTime: { [Op.gt]: startTime }
            }
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "Ya existe una reserva en este rango de tiempo" });
        }

        // Validar horario del barbero
        const barberData = await User.findByPk(barber);
        if (!barberData || barberData.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Usar índice numérico del día (Mon=1..Sun=7) y normalizar a 0..6 (Sun=0)
        const dayIndex = localStart.weekday % 7; // 0..6
        const schedule = barberData.schedule || {};
        const barberSchedule = schedule[dayIndex.toString()];
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
            const booking = await Booking.create({
                userId: userId,
                barberId: barber,
                barbershopId: barbershop,
                date,
                time,
                startTime,
                endTime,
                serviceName: selectedService.name,
                servicePrice: price,
                serviceDuration: selectedService.duration,
                status: "pending"
            });

            // Cargar relaciones para respuesta
            await booking.reload({
                include: [
                    { model: User, as: "barber", attributes: ["id", "name"] },
                    { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
                ]
            });

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

        const originalBooking = await Booking.findByPk(originalBookingId);
        if (!originalBooking) {
            return res.status(404).json({ message: "Reserva original no encontrada" });
        }

        if (originalBooking.userId !== userId) {
            return res.status(403).json({ message: "No tienes permiso para repetir esta reserva" });
        }

        // Verificar existencia del barbero y barbería
        const barber = await User.findByPk(originalBooking.barberId);
        const barbershop = await Barbershop.findByPk(originalBooking.barbershopId);

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
            where: {
                barberId: originalBooking.barberId,
                start: { [Op.lt]: endTime },
                end: { [Op.gt]: startTime }
            }
        });

        if (overlappingBlock) {
            return res.status(400).json({
                message: `No se puede repetir la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
            });
        }

        // Validar solapamientos
        const overlapping = await Booking.findOne({
            where: {
                barberId: originalBooking.barberId,
                status: { [Op.in]: ["pending", "confirmed"] },
                startTime: { [Op.lt]: endTime },
                endTime: { [Op.gt]: startTime }
            }
        });

        if (overlapping) {
            return res.status(400).json({ message: "Ya existe una reserva en ese rango de tiempo" });
        }

        // Crear nueva reserva
        const newBooking = await Booking.create({
            userId: userId,
            barberId: originalBooking.barberId,
            barbershopId: originalBooking.barbershopId,
            date: newDate,
            time: newTime,
            startTime,
            endTime,
            serviceName: originalBooking.serviceName,
            servicePrice: originalBooking.servicePrice,
            serviceDuration: originalBooking.serviceDuration,
            status: "pending"
        });

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
        const { date, status, barbershop, barbershopId, barber, barberId, user, userId: userIdFilter, limit, sort } = req.query;

        const where = {};

        if (role === 'barber') {
            where.barberId = userId;
        } else if (role === 'owner') {
            const ownerShops = await Barbershop.findAll({ where: { ownerId: userId }, attributes: ["id"] });
            const ownerShopIds = ownerShops.map(s => s.id);
            if (ownerShopIds.length === 0) {
                return res.status(200).json([]);
            }
            where.barbershopId = { [Op.in]: ownerShopIds };
        } else if (role !== 'admin') {
            where.userId = userId;
        }

        if (role === 'admin' || role === 'owner') {
            const resolvedBarbershopId = barbershopId || barbershop;
            const resolvedBarberId = barberId || barber;
            const resolvedUserId = userIdFilter || user;

            if (resolvedBarbershopId) where.barbershopId = resolvedBarbershopId;
            if (resolvedBarberId) where.barberId = resolvedBarberId;
            if (resolvedUserId) where.userId = resolvedUserId;
        } else if (role === 'barber') {
            const resolvedUserId = userIdFilter || user;
            if (resolvedUserId) where.userId = resolvedUserId;
        }

        if (date) {
            where.date = date;
        }

        if (status) {
            const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
            if (statuses.length > 0) {
                where.status = { [Op.in]: statuses };
            }
        }

        const allowedSortFields = new Set(['createdAt', 'date', 'time', 'startTime', 'endTime', 'servicePrice', 'status']);
        const order = [];
        if (sort) {
            String(sort).split(',').forEach((field) => {
                if (!field) return;
                const direction = field.startsWith('-') ? 'DESC' : 'ASC';
                const cleanField = field.replace(/^-/, '');
                if (allowedSortFields.has(cleanField)) {
                    order.push([cleanField, direction]);
                }
            });
        }

        if (order.length === 0) {
            order.push(["date", "ASC"], ["time", "ASC"]);
        }

        const parsedLimit = Number(limit);

        const bookings = await Booking.findAll({
            where,
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email", "phone"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "location"] }
            ],
            order,
            ...(Number.isFinite(parsedLimit) && parsedLimit > 0 ? { limit: parsedLimit } : {})
        });

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

        const where = { userId };

        if (type === "upcoming") {
            where.date = { [Op.gte]: today };
        } else if (type === "past") {
            where.date = { [Op.lt]: today };
        }

        const bookings = await Booking.findAll({
            where,
            include: [
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name"] }
            ],
            order: [["date", type === "upcoming" ? "ASC" : "DESC"]]
        });

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

        const where = { barberId };

        if (type === "week") {
            const startOfWeek = DateTime.fromISO(date).startOf('week').plus({ days: 1 }); // lunes
            const endOfWeek = startOfWeek.plus({ days: 6 }); // domingo
            where.date = { [Op.between]: [startOfWeek.toISODate(), endOfWeek.toISODate()] };
        } else {
            where.date = parseDate.toISODate();
        }
        console.log("Buscando con where:", where);
        const bookings = await Booking.findAll({
            where,
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email", "phone"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address", "phone"] }
            ],
            order: [["startTime", "DESC"]]
        });

        // Procesar bookings para incluir datos de walk-in
        const processedBookings = bookings.map(booking => {
            const bookingObj = booking.get({ plain: true });
            
            // Si no hay usuario registrado, usar datos de walkInClient
            if (!bookingObj.user && bookingObj.walkInClient) {
                bookingObj.user = {
                    name: bookingObj.walkInClient.name,
                    email: bookingObj.walkInClient.email,
                    phone: bookingObj.walkInClient.phone
                };
                bookingObj.isWalkIn = true;
            }
            
            return bookingObj;
        });

        res.status(200).json({ agenda: processedBookings });
    } catch (error) {
        console.error(error);
        handleError(res, 'Error al obtener la agenda del barbero', 500, error);
    }
}

//Cancelar o modificar una reserva
// En Sequelize, los valores del ENUM están en rawAttributes
const VALID_STATUSES = Booking.rawAttributes.status.values || ['pending', 'confirmed', 'cancelled', 'completed'];

const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, date, startTime, endTime, barberId, servicePrice } = req.body;

        const booking = await Booking.findByPk(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" })
        }
        const previousStatus = booking.status;

        //Validacion de permisos para los roles
        const userId = req.user.id;
        const userRole = req.user.role;

        const isOwner = booking.userId === userId;
        const isBarber = booking.barberId === userId;
        const isAdmin = userRole === 'admin' || userRole === 'owner';

        if (userRole === 'owner') {
            const ownerShops = await Barbershop.findAll({ where: { ownerId: userId }, attributes: ["id"] });
            const ownerShopIds = ownerShops.map(s => s.id);
            if (!ownerShopIds.includes(booking.barbershopId)) {
                return res.status(403).json({ message: "No tienes permisos para modificar esta reserva" });
            }
        }

        if (!isOwner && !isBarber && !isAdmin) {
            return res.status(403).json({ message: "No tienes permisos para modificar esta reserva" });
        }

        const hasAdminFields = [date, startTime, endTime, barberId, servicePrice].some(v => v !== undefined);
        if (!isAdmin && hasAdminFields) {
            return res.status(403).json({ message: "Solo un administrador puede modificar los datos de la reserva" });
        }

        if (status !== undefined) {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({ message: "Estado no válido" });
            }

            if (!isAdmin) {
                // Validaciones de transiciones de estado
                const currentStatus = booking.status;
                const newStatus = status;

                // Validar transiciones válidas
                const validTransitions = {
                    'pending': ['confirmed', 'cancelled'],
                    'confirmed': ['completed', 'cancelled'],
                    'cancelled': [],
                    'completed': []
                };

                if (!validTransitions[currentStatus].includes(newStatus)) {
                    return res.status(400).json({ 
                        message: `No se puede cambiar el estado de '${currentStatus}' a '${newStatus}'` 
                    });
                }

                // Validaciones específicas por rol
                if (newStatus === "completed" && !isBarber) {
                    return res.status(403).json({ message: "Solo el barbero o admin puede marcar como completada" });
                }

                if (newStatus === "confirmed" && !isBarber) {
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
            }
        }

        if (isAdmin && hasAdminFields) {
            const newDate = date || booking.date;
            const newStartTime = startTime || booking.time;
            const newEndTime = endTime;
            const newBarberId = barberId || booking.barberId;

            const barber = await User.findByPk(newBarberId);
            if (!barber || barber.role !== 'barber') {
                return res.status(404).json({ message: "Barbero no encontrado" });
            }

            const barbershop = await Barbershop.findByPk(booking.barbershopId);
            if (!barbershop) {
                return res.status(404).json({ message: "Barbería no encontrada" });
            }

            const localStart = DateTime.fromISO(`${newDate}T${newStartTime}`, { zone: 'America/Bogota' });
            if (!localStart.isValid) {
                return res.status(400).json({ message: "Fecha u hora inválida" });
            }

            const localEnd = newEndTime
                ? DateTime.fromISO(`${newDate}T${newEndTime}`, { zone: 'America/Bogota' })
                : localStart.plus({ minutes: booking.serviceDuration || 0 });
            if (!localEnd.isValid) {
                return res.status(400).json({ message: "Hora de fin inválida" });
            }
            if (localEnd <= localStart) {
                return res.status(400).json({ message: "La hora de fin debe ser posterior a la hora de inicio" });
            }

            const startDateUtc = localStart.toUTC().toJSDate();
            const endDateUtc = localEnd.toUTC().toJSDate();

            // Validar horario de apertura de la barbería
            const { openHour, closeHour } = barbershop.openingHours || { openHour: 9, closeHour: 18 };
            if (
                localStart.hour < openHour ||
                localEnd.hour > closeHour ||
                (localEnd.hour === closeHour && localEnd.minute > 0)
            ) {
                return res.status(400).json({
                    message: `La reserva debe estar entre las ${String(openHour).padStart(2, '0')}:00 y las ${String(closeHour).padStart(2, '0')}:00`
                });
            }

            // Validar horario del barbero
            const dayIndex = localStart.weekday % 7;
            const schedule = barber.schedule || {};
            const barberSchedule = schedule[dayIndex.toString()];
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

            // Validar bloqueos de disponibilidad del barbero
            const overlappingBlock = await AvailabilityBlock.findOne({
                where: {
                    barberId: newBarberId,
                    start: { [Op.lt]: endDateUtc },
                    end: { [Op.gt]: startDateUtc }
                }
            });

            if (overlappingBlock) {
                return res.status(400).json({
                    message: `No se puede modificar la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
                });
            }

            // Validar solapamiento con otras reservas activas
            const overlappingBooking = await Booking.findOne({
                where: {
                    id: { [Op.ne]: booking.id },
                    barberId: newBarberId,
                    status: { [Op.in]: ["pending", "confirmed"] },
                    startTime: { [Op.lt]: endDateUtc },
                    endTime: { [Op.gt]: startDateUtc }
                }
            });

            if (overlappingBooking) {
                return res.status(400).json({ message: "Ya existe una reserva en este rango de tiempo" });
            }

            booking.barberId = newBarberId;
            booking.date = newDate;
            booking.time = newStartTime;
            booking.startTime = startDateUtc;
            booking.endTime = endDateUtc;

            if (servicePrice !== undefined) {
                booking.servicePrice = Number(servicePrice) || 0;
            }
        }

        if (status !== undefined) {
            booking.status = status;
        }

        // Registrar quién lo modificó
        booking.modifiedBy = userId;
        await booking.save();

        // Cargar relaciones para respuesta
        await booking.reload({
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "location", "address"] }
            ]
        });

        const updatedStatus = booking.status;
        res.json({ 
            message: status !== undefined ? `Estado actualizado a '${updatedStatus}' correctamente` : "Reserva actualizada correctamente",
            booking,
            ...(status !== undefined ? { previousStatus, newStatus: updatedStatus } : {})
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

        const booking = await Booking.findByPk(id);

        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        if (booking.userId !== userId) {
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

        // Cargar relaciones para respuesta
        await booking.reload({
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
            ]
        });

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
        const isAdmin = userRole === 'admin';
        const isOwner = userRole === 'owner';

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Solo un administrador puede eliminar reservas" });
        }

        const booking = await Booking.findByPk(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        if (isOwner) {
            const ownerShops = await Barbershop.findAll({ where: { ownerId: req.user.id }, attributes: ["id"] });
            const ownerShopIds = ownerShops.map(s => s.id);
            if (!ownerShopIds.includes(booking.barbershopId)) {
                return res.status(403).json({ message: "No autorizado para eliminar esta reserva" });
            }
        }

        await booking.destroy();
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
        const barbershop = await Barbershop.findByPk(barbershopId);
        if (!barbershop) return res.status(404).json({ message: "Barbería no encontrada" });

        const services = barbershop.services || [];
        const service = services.find(s => {
            const id = s.id || s._id;
            return id && id.toString() === serviceId;
        });
        if (!service) return res.status(404).json({ message: "Servicio no encontrado" });

        if (barberId) {
            const barber = await User.findByPk(barberId);
            if (!barber || barber.role !== 'barber') {
                return res.status(404).json({ message: "Barbero no encontrado" });
            }
            const customPrice = barber.customPrices?.[serviceId];
            if (!customPrice || !customPrice.isActive) {
                return res.json({ availableSlots: [] });
            }
        }

        const serviceDuration = service.duration;

        // 2. Obtener horario del barbero
        const barber = await User.findByPk(barberId);
        const schedule = barber?.schedule || {};
        const workingHours = schedule?.[dayOfWeek.toString()];

        if (!workingHours || !workingHours.start || !workingHours.end) {
            return res.json({ availableSlots: [] });
        }

        // 3. Construir slots posibles (granularidad 15 min)
        const startTime = DateTime.fromISO(`${date}T${workingHours.start}`);
        const endTime = DateTime.fromISO(`${date}T${workingHours.end}`);
        const allSlots = [];

        const slotStepMinutes = 15;
        let current = startTime;
        while (current.plus({ minutes: serviceDuration }) <= endTime) {
            allSlots.push({
                start: current.toISO(),
                end: current.plus({ minutes: serviceDuration }).toISO(),
            });
            current = current.plus({ minutes: slotStepMinutes });
        }

        // 4. Obtener reservas existentes en ese día
        const dayStart = startTime.startOf("day");
        const dayEnd = startTime.endOf("day");

        const bookings = await Booking.findAll({
            where: {
                barberId,
                status: { [Op.in]: ["pending", "confirmed"] },
                startTime: { [Op.lt]: dayEnd.toJSDate() },
                endTime: { [Op.gt]: dayStart.toJSDate() }
            }
        });

        const reservedIntervals = bookings.map(b =>
            Interval.fromDateTimes(DateTime.fromJSDate(b.startTime), DateTime.fromJSDate(b.endTime))
        );

        // 5. Obtener bloqueos del barbero en ese día
        const blocks = await AvailabilityBlock.findAll({
            where: {
                [Op.or]: [
                    { appliesToAllBarbers: true },
                    { barberId }
                ],
                start: { [Op.lt]: dayEnd.toJSDate() },
                end: { [Op.gt]: dayStart.toJSDate() }
            }
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
        const where = { userId };

        if (type === "upcoming") {
            where[Op.or] = [
                { status: { [Op.in]: ["pending", "confirmed"] }, date: { [Op.gte]: today.toISODate() } }
            ];
        } else if (type === "past") {
            where[Op.or] = [
                { status: { [Op.in]: ["completed", "cancelled"] } },
                { date: { [Op.lt]: today.toISODate() } }
            ];
        }

        const bookings = await Booking.findAll({
            where,
            include: [
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name"] }
            ],
            order: [["date", type === "past" ? "DESC" : "ASC"]]
        });

        res.json({ bookings });
    } catch (err) {
        handleError(res, 'Error al obtener historial de reservas', 500, err);
    }
};


// Crear reserva como barbero o admin (para clientes)
const createBookingForClient = async (req, res) => {
    try {
        const staffId = req.user.id;
        const staffRole = req.user.role;
        const { userId, barbershop, barber, serviceId, date, time } = req.body;

        // Validar que sea barbero/admin/owner
        if (!['barber', 'admin', 'owner'].includes(staffRole)) {
            return res.status(403).json({ message: "Solo barberos, administradores u owners pueden crear reservas para clientes" });
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
        const dataBarber = await User.findByPk(barber);
        if (!dataBarber || dataBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Validar cliente
        const clientData = await User.findByPk(userId);
        if (!clientData || clientData.role !== 'client') {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        // Validar barbería
        const barbershopData = await Barbershop.findByPk(barbershop);
        if (!barbershopData) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }
        if (staffRole === 'owner' && barbershopData.ownerId !== staffId) {
            return res.status(403).json({ message: "No puedes crear reservas para otra barbería" });
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
            where: {
                barberId: barber,
                start: { [Op.lt]: endTime },
                end: { [Op.gt]: startTime }
            }
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
            where: {
                barberId: barber,
                status: { [Op.in]: ["pending", "confirmed"] },
                startTime: { [Op.lt]: endTime },
                endTime: { [Op.gt]: startTime }
            }
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "Ya existe una reserva en este rango de tiempo" });
        }

        // Validar horario del barbero
        const dayIndex = localStart.weekday % 7; // 0..6
        const barberSchedule = dataBarber.schedule?.[dayIndex.toString()];
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
            const booking = await Booking.create({
                userId: userId,
                barberId: barber,
                barbershopId: barbershop,
                date,
                time,
                startTime,
                endTime,
                serviceName: selectedService.name,
                servicePrice: price,
                serviceDuration: selectedService.duration,
                status: "confirmed", // Confirmada automáticamente cuando la crea el staff
                createdById: staffId // Campo para rastrear quién creó la reserva
            });

            // Cargar relaciones para respuesta
            await booking.reload({
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "email"] },
                    { model: User, as: "barber", attributes: ["id", "name"] },
                    { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
                ]
            });

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

        const booking = await Booking.findByPk(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        // Validar que la reserva no esté cancelada o completada
        if (['cancelled', 'completed'].includes(booking.status)) {
            return res.status(400).json({ message: "No se puede modificar el barbero de una reserva cancelada o completada" });
        }

        // Validar nuevo barbero
        const newBarber = await User.findByPk(newBarberId);
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
            where: {
                barberId: newBarberId,
                id: { [Op.ne]: booking.id },
                status: { [Op.in]: ["pending", "confirmed"] },
                startTime: { [Op.lt]: booking.endTime },
                endTime: { [Op.gt]: booking.startTime }
            }
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "El nuevo barbero ya tiene una reserva en ese horario" });
        }

        // Validar bloqueos de disponibilidad del nuevo barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            where: {
                barberId: newBarberId,
                start: { [Op.lt]: booking.endTime },
                end: { [Op.gt]: booking.startTime }
            }
        });

        if (overlappingBlock) {
            return res.status(400).json({
                message: `No se puede asignar al nuevo barbero porque tiene un bloqueo de disponibilidad: ${overlappingBlock.reason}`
            });
        }

        // Actualizar la reserva
        const oldBarberId = booking.barberId;
        booking.barberId = newBarberId;
        booking.modifiedById = req.user.id; // Campo para rastrear quién modificó la reserva
        await booking.save();

        // Cargar relaciones para respuesta
        await booking.reload({
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
            ]
        });

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

        const where = {};

        if (role === 'barber') {
            where.barberId = userId;
        } else if (role !== 'admin') {
            where.userId = userId;
        }

        if (date) {
            where.date = date;
        }

        const bookings = await Booking.findAll({
            where,
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
            ],
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]]
        });

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

        const where = {};

        // Filtro por rol
        if (role === 'admin') {
            // Admin ve todo
        } else if (role === 'barber') {
            where.barberId = userId;
        } else {
            where.userId = userId;
        }

        // Filtro por fecha si se proporciona
        if (date) {
            where.date = date;
        }

        const stats = await Booking.findAll({
            where,
            attributes: [
                'status',
                [Booking.sequelize.fn('COUNT', Booking.sequelize.col('id')), 'count'],
                [Booking.sequelize.fn('SUM', Booking.sequelize.col('servicePrice')), 'totalRevenue']
            ],
            group: ['status']
        });

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
            const status = stat.get('status');
            const count = Number(stat.get('count') || 0);
            const totalRevenue = Number(stat.get('totalRevenue') || 0);
            formattedStats[status] = count;
            if (status === 'completed') {
                formattedStats.totalRevenue = totalRevenue;
            }
            formattedStats.totalBookings += count;
        });

        res.json({
            stats: formattedStats,
            lastUpdate: new Date().toISOString()
        });

    } catch (err) {
        handleError(res, 'Error al obtener estadísticas de reservas', 500, err);
    }
};

// Crear reserva walk-in (cliente no registrado)
const createWalkInBooking = async (req, res) => {
    try {
        const staffRole = req.user.role;
        const staffId = req.user.id;
        const { clientName, clientPhone, clientEmail, serviceId, date, time, notes, barberId: barberIdInput } = req.body;

        if (!clientName || !serviceId || !date || !time) {
            return res.status(400).json({ message: "Nombre del cliente, servicio, fecha y hora son obligatorios" });
        }

        // Validar que la fecha sea futura
        const requestedDate = DateTime.fromISO(date);
        if (requestedDate < DateTime.now().startOf('day')) {
            return res.status(400).json({ message: "No se pueden hacer reservas en fechas pasadas" });
        }

        const resolvedBarberId = staffRole === 'barber' ? staffId : barberIdInput;
        if (!resolvedBarberId) {
            return res.status(400).json({ message: "Barbero es obligatorio para crear una reserva walk-in" });
        }

        // Validar barbero
        const barber = await User.findByPk(resolvedBarberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Obtener barbería del barbero
        const barbershop = barber.barbershopId ? await Barbershop.findByPk(barber.barbershopId) : null;
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }
        if (staffRole === 'owner' && barbershop.ownerId !== staffId) {
            return res.status(403).json({ message: "No puedes crear reservas para otra barbería" });
        }

        // Obtener servicio y precio usando la función helper
        try {
            const { service: selectedService, price: servicePrice } = await getServiceAndPrice(serviceId, resolvedBarberId, barbershop.id);
            const { name: serviceName, duration } = selectedService;

            // Calcular tiempos
            const localStart = DateTime.fromISO(`${date}T${time}`, { zone: 'America/Bogota' });
            if (!localStart.isValid) return res.status(400).json({ message: "Fecha u hora inválida" });

            const localEnd = localStart.plus({ minutes: selectedService.duration });
            const startTime = localStart.toUTC().toJSDate();
            const endTime = localEnd.toUTC().toJSDate();

            // Validar bloqueos de disponibilidad del barbero
            const overlappingBlock = await AvailabilityBlock.findOne({
                where: {
                    barberId: resolvedBarberId,
                    start: { [Op.lt]: endTime },
                    end: { [Op.gt]: startTime }
                }
            });

            if (overlappingBlock) {
                return res.status(400).json({
                    message: `No se puede crear la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
                });
            }

            // Validar solapamientos
            const overlapping = await Booking.findOne({
                where: {
                    barberId: resolvedBarberId,
                    status: { [Op.in]: ["pending", "confirmed"] },
                    startTime: { [Op.lt]: endTime },
                    endTime: { [Op.gt]: startTime }
                }
            });

            if (overlapping) {
                return res.status(400).json({ message: "Ya existe una reserva en ese rango de tiempo" });
            }

            // Crear cliente temporal (no registrado)
            const tempClient = {
                name: clientName,
                email: clientEmail || `temp_${Date.now()}@walkin.com`,
                phone: clientPhone || '',
                role: 'client',
                isWalkIn: true
            };

            // Crear reserva
            const booking = await Booking.create({
                userId: null, // Cliente no registrado
                barberId: resolvedBarberId,
                barbershopId: barbershop.id,
                date,
                time,
                startTime,
                endTime,
                serviceName: selectedService.name,
                servicePrice: servicePrice,
                serviceDuration: selectedService.duration,
                status: "confirmed", // Confirmada automáticamente para walk-in
                notes: notes || '',
                walkInClient: tempClient, // Datos del cliente walk-in
                createdById: resolvedBarberId
            });

            res.status(201).json({ 
                message: "Reserva walk-in creada exitosamente", 
                booking: {
                    ...booking.get({ plain: true }),
                    walkInClient: tempClient
                }
            });

        } catch (serviceError) {
            return res.status(400).json({ message: serviceError.message });
        }

    } catch (err) {
        console.error('Error al crear reserva walk-in:', err);
        handleError(res, 'Error al crear reserva walk-in', 500, err);
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
    createBookingForClient,
    changeBookingBarber,
    getBookingsWithAutoUpdate,
    getBookingStats,
    createWalkInBooking
};
