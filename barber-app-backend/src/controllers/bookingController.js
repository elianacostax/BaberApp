const Barbershop = require("../models/Barbershop");
const AvailabilityBlock = require("../models/AvailabilityBlock");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const { logger } = require("../utils/logger");
const { notifyBookingEvent } = require("../utils/bookingNotifications");
const {
    parseBookingHistory,
    appendBookingHistory
} = require("../utils/bookingHistory");
const Booking = require('../models/Booking')
const { DateTime } = require('luxon')
const { Interval } = require('luxon');
const { Op } = require("sequelize");

const APP_TIMEZONE = 'America/Bogota';
const MIN_BOOKING_LEAD_MINUTES = 60;
const CLIENT_CANCEL_WINDOW_MINUTES = 30;
const BOOKING_BUFFER_MINUTES = Number(process.env.BOOKING_BUFFER_MINUTES || 10);
const SLOT_STEP_MINUTES = Number(process.env.BOOKING_SLOT_STEP_MINUTES || 15);

const getLocalDateTime = (date, time) =>
    DateTime.fromISO(`${date}T${time}`, { zone: APP_TIMEZONE });

const validateBookingLeadTime = (localStart) => {
    if (!localStart.isValid) {
        return "Fecha u hora inválida";
    }

    const now = DateTime.now().setZone(APP_TIMEZONE);
    if (localStart < now.startOf('day')) {
        return "No se pueden hacer reservas en fechas pasadas";
    }

    if (localStart <= now.plus({ minutes: MIN_BOOKING_LEAD_MINUTES })) {
        return `La reserva debe hacerse con al menos ${MIN_BOOKING_LEAD_MINUTES} minutos de anticipación`;
    }

    return null;
};

const resolveBarberWorkingWindow = ({ localDate, barber, barbershop }) => {
    const dayIndex = localDate.weekday % 7;
    const fullSchedule = barber?.schedule || {};
    const barberSchedule = fullSchedule[dayIndex.toString()];
    const hasAnyConfiguredDay = Object.values(fullSchedule).some((entry) => entry?.start && entry?.end);

    let startLabel = barberSchedule?.start;
    let endLabel = barberSchedule?.end;

    if (!startLabel || !endLabel) {
        if (hasAnyConfiguredDay) return null;
        const openHour = Number(barbershop?.openingHours?.openHour ?? 9);
        const closeHour = Number(barbershop?.openingHours?.closeHour ?? 18);
        startLabel = `${String(openHour).padStart(2, "0")}:00`;
        endLabel = `${String(closeHour).padStart(2, "0")}:00`;
    }

    if (!startLabel || !endLabel) return null;

    const [startHour, startMinute] = startLabel.split(":").map(Number);
    const [endHour, endMinute] = endLabel.split(":").map(Number);
    if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) {
        return null;
    }

    const windowStart = localDate.set({ hour: startHour, minute: startMinute, second: 0, millisecond: 0 });
    const windowEnd = localDate.set({ hour: endHour, minute: endMinute, second: 0, millisecond: 0 });
    if (!windowStart.isValid || !windowEnd.isValid || windowEnd <= windowStart) {
        return null;
    }

    return { windowStart, windowEnd, startLabel, endLabel };
};

const getEffectiveStatus = (bookingLike) => {
    if (bookingLike.status !== 'pending') return bookingLike.status;

    const now = DateTime.now().setZone(APP_TIMEZONE);
    const start = bookingLike.startTime
        ? DateTime.fromJSDate(new Date(bookingLike.startTime), { zone: APP_TIMEZONE })
        : getLocalDateTime(bookingLike.date, bookingLike.time);

    if (!start.isValid) return bookingLike.status;
    return start < now ? 'expired' : bookingLike.status;
};

const serializeBooking = (booking) => {
    const plain = typeof booking.get === 'function' ? booking.get({ plain: true }) : { ...booking };
    const { cleanNotes, history } = parseBookingHistory(plain.notes || '');
    const status = getEffectiveStatus(plain);

    return {
        ...plain,
        notes: cleanNotes,
        history,
        originalStatus: plain.status,
        isExpired: status === 'expired',
        status
    };
};

const serializeBookings = (bookings = []) => bookings.map(serializeBooking);

const getOwnerBarbershopIds = async (ownerId) => {
    const shops = await Barbershop.findAll({
        where: { ownerId },
        attributes: ["id"]
    });
    return shops.map((shop) => shop.id);
};

const buildAvailabilityBlockWhere = ({ barberId, barbershopId, startTime, endTime }) => ({
    [Op.or]: [
        { barberId },
        {
            appliesToAllBarbers: true,
            ...(barbershopId ? { barbershopId } : {})
        }
    ],
    start: { [Op.lt]: endTime },
    end: { [Op.gt]: startTime }
});

const withBufferMinutes = (date, minutes = BOOKING_BUFFER_MINUTES) =>
    new Date(new Date(date).getTime() + minutes * 60 * 1000);

const withNegativeBufferMinutes = (date, minutes = BOOKING_BUFFER_MINUTES) =>
    new Date(new Date(date).getTime() - minutes * 60 * 1000);

const triggerBookingNotification = (bookingId, eventType, payload = {}) => {
    notifyBookingEvent({ bookingId, eventType, payload }).catch((error) => {
        logger.error("Booking notification dispatch failed", {
            bookingId,
            eventType,
            error: error.message
        });
    });
};

const ensureClientAssignmentForBarbershop = async ({
    client,
    barbershopId,
    actorRole,
    allowAdminOverride = false
}) => {
    if (!client || client.role !== "client") {
        throw new Error("Cliente no válido");
    }

    if (!client.barbershopId) {
        client.barbershopId = barbershopId;
        await client.save();
        return { assigned: true, changed: true };
    }

    if (client.barbershopId === barbershopId) {
        return { assigned: true, changed: false };
    }

    if (actorRole === "admin" && allowAdminOverride) {
        client.barbershopId = barbershopId;
        await client.save();
        return { assigned: true, changed: true };
    }

    return { assigned: false, changed: false };
};

const hasBufferedBookingConflict = async ({ barberId, startTime, endTime, excludeBookingId = null }) => {
    const candidateEndWithBuffer = withBufferMinutes(endTime);
    const candidateStartWithBuffer = withNegativeBufferMinutes(startTime);

    const overlappingBooking = await Booking.findOne({
        where: {
            barberId,
            ...(excludeBookingId ? { id: { [Op.ne]: excludeBookingId } } : {}),
            status: { [Op.in]: ["pending", "confirmed"] },
            startTime: { [Op.lt]: candidateEndWithBuffer },
            endTime: { [Op.gt]: candidateStartWithBuffer }
        }
    });

    return overlappingBooking;
};

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

const getServiceContextForBarber = async ({ serviceId, barberId, barbershopId }) => {
    const { service, price } = await getServiceAndPrice(serviceId, barberId, barbershopId);
    return {
        service,
        price,
        duration: Number(service.duration),
        name: service.name
    };
};

const getBufferedReservedIntervalsForBarber = async ({ barberId, dayStart, dayEnd }) => {
    const bookings = await Booking.findAll({
        where: {
            barberId,
            status: { [Op.in]: ["pending", "confirmed"] },
            startTime: { [Op.lt]: dayEnd.toJSDate() },
            endTime: { [Op.gt]: dayStart.toJSDate() }
        }
    });

    return {
        bookings,
        intervals: bookings.map((booking) =>
            Interval.fromDateTimes(
                DateTime.fromJSDate(new Date(booking.startTime), { zone: APP_TIMEZONE }),
                DateTime.fromJSDate(withBufferMinutes(booking.endTime), { zone: APP_TIMEZONE })
            )
        )
    };
};

const getBlockedIntervalsForBarber = async ({ barberId, barbershopId, dayStart, dayEnd }) => {
    const blocks = await AvailabilityBlock.findAll({
        where: {
            [Op.or]: [
                { appliesToAllBarbers: true, barbershopId },
                { barberId }
            ],
            start: { [Op.lt]: dayEnd.toJSDate() },
            end: { [Op.gt]: dayStart.toJSDate() }
        }
    });

    return blocks.map((block) =>
        Interval.fromDateTimes(
            DateTime.fromJSDate(new Date(block.start), { zone: APP_TIMEZONE }),
            DateTime.fromJSDate(new Date(block.end), { zone: APP_TIMEZONE })
        )
    );
};

const buildAvailableSlotsForBarber = async ({ barber, barbershop, serviceId, date }) => {
    const serviceContext = await getServiceContextForBarber({
        serviceId,
        barberId: barber.id,
        barbershopId: barbershop.id
    });

    if (!serviceContext.duration || serviceContext.duration <= 0) {
        return { slots: [], serviceContext };
    }

    const requestedDate = DateTime.fromISO(date, { zone: APP_TIMEZONE });
    const dayStart = requestedDate.startOf("day");
    const dayEnd = requestedDate.endOf("day");

    const workingWindow = resolveBarberWorkingWindow({
        localDate: requestedDate,
        barber,
        barbershop
    });
    if (!workingWindow) {
        return { slots: [], serviceContext };
    }

    const shopOpenHour = Number(barbershop.openingHours?.openHour ?? 9);
    const shopCloseHour = Number(barbershop.openingHours?.closeHour ?? 18);
    const shopStart = requestedDate.set({ hour: shopOpenHour, minute: 0, second: 0, millisecond: 0 });
    const shopEnd = requestedDate.set({ hour: shopCloseHour, minute: 0, second: 0, millisecond: 0 });
    const workingStart = workingWindow.windowStart > shopStart ? workingWindow.windowStart : shopStart;
    const workingEnd = workingWindow.windowEnd < shopEnd ? workingWindow.windowEnd : shopEnd;

    if (!workingStart.isValid || !workingEnd.isValid || workingEnd <= workingStart) {
        return { slots: [], serviceContext };
    }

    const allSlots = [];
    let current = workingStart;
    while (current.plus({ minutes: serviceContext.duration + BOOKING_BUFFER_MINUTES }) <= workingEnd) {
        allSlots.push({
            start: current,
            end: current.plus({ minutes: serviceContext.duration }),
        });
        current = current.plus({ minutes: SLOT_STEP_MINUTES });
    }

    const { bookings, intervals: reservedIntervals } = await getBufferedReservedIntervalsForBarber({
        barberId: barber.id,
        dayStart,
        dayEnd
    });
    const blockedIntervals = await getBlockedIntervalsForBarber({
        barberId: barber.id,
        barbershopId: barbershop.id,
        dayStart,
        dayEnd
    });

    const now = DateTime.now().setZone(APP_TIMEZONE);
    const minAllowedStart = now.plus({ minutes: MIN_BOOKING_LEAD_MINUTES });
    const slots = allSlots
        .filter((slot) => {
            const slotInterval = Interval.fromDateTimes(
                slot.start,
                slot.end.plus({ minutes: BOOKING_BUFFER_MINUTES })
            );

            const overlapsReservation = reservedIntervals.some((reserved) => reserved.overlaps(slotInterval));
            const overlapsBlock = blockedIntervals.some((blocked) => blocked.overlaps(slotInterval));
            const isPastSlot = slot.start <= minAllowedStart;

            return !overlapsReservation && !overlapsBlock && !isPastSlot;
        })
        .map((slot) => ({
            start: slot.start.toISO(),
            end: slot.end.toISO(),
        }));

    return {
        slots,
        serviceContext,
        activeBookingsCount: bookings.length
    };
};

const recommendBarberForBooking = async ({ barbershopId, serviceId, date, preferredTime }) => {
    const barbershop = await Barbershop.findByPk(barbershopId);
    if (!barbershop) {
        throw new Error("Barbería no encontrada");
    }

    const barbers = await User.findAll({
        where: {
            role: "barber",
            isActive: true,
            barbershopId
        },
        attributes: ["id", "name", "phone", "email", "schedule", "barbershopId", "customPrices", "customServices"]
    });

    const preferredDateTime = preferredTime
        ? getLocalDateTime(date, preferredTime)
        : null;

    const candidates = [];

    for (const barber of barbers) {
        try {
            const availability = await buildAvailableSlotsForBarber({
                barber,
                barbershop,
                serviceId,
                date
            });

            if (!availability.slots.length) continue;

            const exactSlot = preferredTime
                ? availability.slots.find((slot) => DateTime.fromISO(slot.start, { zone: APP_TIMEZONE }).toFormat("HH:mm") === preferredTime)
                : null;
            const firstSlot = availability.slots[0];
            const chosenSlot = exactSlot || firstSlot;
            const slotStart = DateTime.fromISO(chosenSlot.start, { zone: APP_TIMEZONE });
            const minutesOffset = preferredDateTime?.isValid
                ? Math.abs(Math.round(slotStart.diff(preferredDateTime, "minutes").minutes))
                : 0;

            candidates.push({
                barber: {
                    id: barber.id,
                    name: barber.name,
                    phone: barber.phone,
                    email: barber.email
                },
                firstAvailableSlot: firstSlot,
                matchingSlot: exactSlot,
                availableSlotsCount: availability.slots.length,
                activeBookingsCount: availability.activeBookingsCount || 0,
                score: [
                    exactSlot ? 0 : 1,
                    minutesOffset,
                    availability.activeBookingsCount || 0
                ],
            });
        } catch {
            // Si el barbero no ofrece el servicio o tiene configuración inválida, se omite.
        }
    }

    candidates.sort((a, b) => {
        for (let i = 0; i < a.score.length; i += 1) {
            if (a.score[i] !== b.score[i]) return a.score[i] - b.score[i];
        }
        return a.barber.name.localeCompare(b.barber.name);
    });

    return {
        recommended: candidates[0] || null,
        candidates
    };
};

//Crear una reserva
const createBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { barbershop, barber, serviceId, date, time } = req.body;
        const wasAutoAssigned = !barber;
        let resolvedBarberId = barber;

        if (!barbershop || !serviceId || !date || !time) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }

        if (!resolvedBarberId) {
            const recommendation = await recommendBarberForBooking({
                barbershopId: barbershop,
                serviceId,
                date,
                preferredTime: time
            });

            if (!recommendation.recommended?.matchingSlot) {
                return res.status(400).json({ message: "No hay un barbero disponible para ese servicio y horario" });
            }

            resolvedBarberId = recommendation.recommended.barber.id;
        }

        // Validar barbero
        const dataBarber = await User.findByPk(resolvedBarberId);
        if (!dataBarber || dataBarber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Validar barbería
        const barbershopData = await Barbershop.findByPk(barbershop);
        if (!barbershopData) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }
        if (dataBarber.barbershopId !== barbershop) {
            return res.status(400).json({ message: "El barbero no pertenece a la barbería seleccionada" });
        }

        const clientUser = await User.findByPk(userId);
        if (!clientUser || clientUser.role !== "client") {
            return res.status(403).json({ message: "Solo los clientes pueden crear reservas en este endpoint" });
        }

        const clientAssignment = await ensureClientAssignmentForBarbershop({
            client: clientUser,
            barbershopId: barbershop,
            actorRole: userRole
        });
        if (!clientAssignment.assigned) {
            return res.status(403).json({
                message: "Tu cuenta ya está asociada a otra barbería. Contacta al administrador para moverla."
            });
        }

        // Obtener servicio y precio usando la función helper
        try {
            const { service: selectedService, price: servicePrice, serviceSource } = await getServiceAndPrice(serviceId, resolvedBarberId, barbershop);
            const { name: serviceName, duration } = selectedService;
            const price = servicePrice;


        // Calcular tiempos
        const localStart = getLocalDateTime(date, time);
        const leadTimeError = validateBookingLeadTime(localStart);
        if (leadTimeError) return res.status(400).json({ message: leadTimeError });

        const localEnd = localStart.plus({ minutes: selectedService.duration });
        const startTime = localStart.toUTC().toJSDate();
        const endTime = localEnd.toUTC().toJSDate();

        // Validar bloqueos de disponibilidad del barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            where: buildAvailabilityBlockWhere({
                barberId: resolvedBarberId,
                barbershopId: barbershop,
                startTime,
                endTime
            })
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
        const overlappingBooking = await hasBufferedBookingConflict({
            barberId: resolvedBarberId,
            startTime,
            endTime
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "Ya existe una reserva en este rango de tiempo" });
        }

        const workingWindow = resolveBarberWorkingWindow({
            localDate: localStart,
            barber: dataBarber,
            barbershop: barbershopData
        });
        if (!workingWindow) {
            return res.status(400).json({ message: `No hay horario disponible para el barbero ese día` });
        }

        if (localStart < workingWindow.windowStart || localEnd > workingWindow.windowEnd) {
            return res.status(400).json({
                message: `El barbero solo trabaja entre ${workingWindow.startLabel} y ${workingWindow.endLabel}`
            });
        }

            // Crear reserva
            const booking = await Booking.create({
                userId: userId,
                barberId: resolvedBarberId,
                barbershopId: barbershop,
                date,
                time,
                startTime,
                endTime,
                serviceName: selectedService.name,
                servicePrice: price,
                serviceDuration: selectedService.duration,
                status: "confirmed",
                createdById: userId
            });
            appendBookingHistory(booking, {
                type: "created",
                actorId: userId,
                actorRole: userRole,
                status: booking.status,
                assignmentMode: wasAutoAssigned ? "auto" : "manual"
            });
            await booking.save();

            // Cargar relaciones para respuesta
            await booking.reload({
                include: [
                    { model: User, as: "barber", attributes: ["id", "name"] },
                    { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
                ]
            });

            triggerBookingNotification(booking.id, "booking_created", { status: booking.status });
            res.status(201).json({ message: "Reserva creada correctamente", booking: serializeBooking(booking) });

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

        const clientUser = await User.findByPk(userId);
        if (!clientUser || clientUser.role !== "client") {
            return res.status(403).json({ message: "Solo los clientes pueden repetir reservas" });
        }

        const clientAssignment = await ensureClientAssignmentForBarbershop({
            client: clientUser,
            barbershopId: originalBooking.barbershopId,
            actorRole: req.user.role
        });
        if (!clientAssignment.assigned) {
            return res.status(403).json({
                message: "Tu cuenta ya está asociada a otra barbería. Contacta al administrador para moverla."
            });
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
        const localStart = getLocalDateTime(newDate, newTime);
        const leadTimeError = validateBookingLeadTime(localStart);
        if (leadTimeError) {
            return res.status(400).json({ message: leadTimeError });
        }

        const localEnd = localStart.plus({ minutes: originalBooking.serviceDuration });
        const startTime = localStart.toUTC().toJSDate();
        const endTime = localEnd.toUTC().toJSDate();

        // Validar bloqueos de disponibilidad del barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            where: buildAvailabilityBlockWhere({
                barberId: originalBooking.barberId,
                barbershopId: originalBooking.barbershopId,
                startTime,
                endTime
            })
        });

        if (overlappingBlock) {
            return res.status(400).json({
                message: `No se puede repetir la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
            });
        }

        // Validar solapamientos
        const overlapping = await hasBufferedBookingConflict({
            barberId: originalBooking.barberId,
            startTime,
            endTime
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
            status: "confirmed",
            createdById: userId
        });
        appendBookingHistory(newBooking, {
            type: "repeated",
            actorId: userId,
            actorRole: req.user.role,
            sourceBookingId: originalBookingId,
            status: newBooking.status
        });
        await newBooking.save();

        triggerBookingNotification(newBooking.id, "booking_repeated", { sourceBookingId: originalBookingId });
        res.status(201).json({ message: "Reserva repetida correctamente", booking: serializeBooking(newBooking) });

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

        let ownerShopIds = null;

        if (role === 'barber') {
            where.barberId = userId;
        } else if (role === 'owner') {
            ownerShopIds = await getOwnerBarbershopIds(userId);
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

            if (resolvedBarbershopId) {
                if (role === 'owner' && ownerShopIds && !ownerShopIds.includes(resolvedBarbershopId)) {
                    return res.status(403).json({ message: "No autorizado para consultar reservas de esa barbería" });
                }
                where.barbershopId = resolvedBarbershopId;
            }
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

        res.status(200).json(serializeBookings(bookings));
    } catch (err) {
        handleError(res, 'Error al obtener reservas', 500, err);
    }
};

// Obtener reservas del cliente (futuras y pasadas)
const getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = "upcoming" } = req.query;

        const today = DateTime.now().setZone(APP_TIMEZONE).toISODate();

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

        res.json({ bookings: serializeBookings(bookings) });
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

        const parseDate = DateTime.fromISO(date, { zone: APP_TIMEZONE });
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
            const bookingObj = serializeBooking(booking);
            
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

                // Validar que no se pueda cancelar una reserva muy próxima
                if (newStatus === "cancelled") {
                    const bookingDateTime = getLocalDateTime(booking.date, booking.time);
                    const now = DateTime.now().setZone(APP_TIMEZONE);
                    const timeDiffInMinutes = bookingDateTime.diff(now, 'minutes').minutes;

                    if (timeDiffInMinutes < CLIENT_CANCEL_WINDOW_MINUTES && !isAdmin) {
                        return res.status(400).json({ 
                            message: `No se puede cancelar una reserva con menos de ${CLIENT_CANCEL_WINDOW_MINUTES} minutos de anticipación`
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
            if (barber.barbershopId !== booking.barbershopId) {
                return res.status(400).json({ message: "El barbero debe pertenecer a la misma barbería de la reserva" });
            }

            const localStart = getLocalDateTime(newDate, newStartTime);
            if (!localStart.isValid) {
                return res.status(400).json({ message: "Fecha u hora inválida" });
            }
            if (localStart <= DateTime.now().setZone(APP_TIMEZONE).plus({ minutes: MIN_BOOKING_LEAD_MINUTES })) {
                return res.status(400).json({ message: `La reserva debe hacerse con al menos ${MIN_BOOKING_LEAD_MINUTES} minutos de anticipación` });
            }

            const localEnd = newEndTime
                ? getLocalDateTime(newDate, newEndTime)
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
            const workingWindow = resolveBarberWorkingWindow({
                localDate: localStart,
                barber,
                barbershop
            });
            if (!workingWindow) {
                return res.status(400).json({ message: `No hay horario disponible para el barbero ese día` });
            }

            if (localStart < workingWindow.windowStart || localEnd > workingWindow.windowEnd) {
                return res.status(400).json({
                    message: `El barbero solo trabaja entre ${workingWindow.startLabel} y ${workingWindow.endLabel}`
                });
            }

            // Validar bloqueos de disponibilidad del barbero
            const overlappingBlock = await AvailabilityBlock.findOne({
                where: buildAvailabilityBlockWhere({
                    barberId: newBarberId,
                    barbershopId: booking.barbershopId,
                    startTime: startDateUtc,
                    endTime: endDateUtc
                })
            });

            if (overlappingBlock) {
                return res.status(400).json({
                    message: `No se puede modificar la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
                });
            }

            // Validar solapamiento con otras reservas activas
            const overlappingBooking = await hasBufferedBookingConflict({
                barberId: newBarberId,
                startTime: startDateUtc,
                endTime: endDateUtc,
                excludeBookingId: booking.id
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
        booking.modifiedById = userId;
        appendBookingHistory(booking, {
            type: status !== undefined ? "status_change" : "updated",
            actorId: userId,
            actorRole: userRole,
            previousStatus,
            newStatus: booking.status
        });
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
        triggerBookingNotification(booking.id, "booking_status_changed", {
            previousStatus,
            newStatus: updatedStatus
        });
        res.json({ 
            message: status !== undefined ? `Estado actualizado a '${updatedStatus}' correctamente` : "Reserva actualizada correctamente",
            booking: serializeBooking(booking),
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

        // Validar ventana mínima para cancelar
        const bookingDateTime = getLocalDateTime(booking.date, booking.time);
        const now = DateTime.now().setZone(APP_TIMEZONE);
        const timeDiffInMinutes = bookingDateTime.diff(now, 'minutes').minutes;

        if (timeDiffInMinutes < CLIENT_CANCEL_WINDOW_MINUTES) {
            return res.status(400).json({ 
                message: `No se puede cancelar una reserva con menos de ${CLIENT_CANCEL_WINDOW_MINUTES} minutos de anticipación. Contacta al barbero o administrador.`
            });
        }

        const previousStatus = booking.status;
        booking.status = "cancelled";
        booking.modifiedById = userId;
        appendBookingHistory(booking, {
            type: "cancelled_by_client",
            actorId: userId,
            actorRole: req.user.role,
            previousStatus,
            newStatus: "cancelled"
        });
        await booking.save();

        // Cargar relaciones para respuesta
        await booking.reload({
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
            ]
        });

        triggerBookingNotification(booking.id, "booking_cancelled", {
            previousStatus,
            newStatus: "cancelled"
        });
        res.json({ 
            message: "Reserva cancelada correctamente", 
            booking: serializeBooking(booking),
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
        if (!barbershopId || !barberId || !serviceId || !date) {
            return res.status(400).json({ message: "barbershopId, barberId, serviceId y date son obligatorios" });
        }

        const requestedDate = DateTime.fromISO(date, { zone: APP_TIMEZONE });
        if (!requestedDate.isValid) {
            return res.status(400).json({ message: "Fecha inválida. Usa formato YYYY-MM-DD" });
        }

        const barbershop = await Barbershop.findByPk(barbershopId);
        if (!barbershop) return res.status(404).json({ message: "Barbería no encontrada" });

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }
        if (barber.barbershopId !== barbershopId) {
            return res.status(400).json({ message: "El barbero no pertenece a la barbería seleccionada" });
        }

        const availability = await buildAvailableSlotsForBarber({
            barber,
            barbershop,
            serviceId,
            date
        });

        return res.json({
            availableSlots: availability.slots,
            bufferMinutes: BOOKING_BUFFER_MINUTES,
            slotStepMinutes: SLOT_STEP_MINUTES
        });

    } catch (err) {
        handleError(res, 'Error al obtener slots disponibles', 500, err);
    }
};

const getRecommendedBarber = async (req, res) => {
    try {
        const { barbershopId, serviceId, date, preferredTime } = req.query;
        if (!barbershopId || !serviceId || !date) {
            return res.status(400).json({ message: "barbershopId, serviceId y date son obligatorios" });
        }

        const recommendation = await recommendBarberForBooking({
            barbershopId,
            serviceId,
            date,
            preferredTime
        });

        return res.json({
            recommendedBarber: recommendation.recommended,
            candidates: recommendation.candidates.slice(0, 5),
            bufferMinutes: BOOKING_BUFFER_MINUTES
        });
    } catch (err) {
        handleError(res, 'Error al recomendar barbero', 500, err);
    }
};

//Obtener historial de reserva
const getMyReservations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = "upcoming" } = req.query;

        const today = DateTime.now().setZone(APP_TIMEZONE).startOf('day');
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

        res.json({ bookings: serializeBookings(bookings) });
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
        const wasAutoAssigned = !barber && staffRole !== "barber";
        let resolvedBarberId = barber;

        // Validar que sea barbero/admin/owner
        if (!['barber', 'admin', 'owner'].includes(staffRole)) {
            return res.status(403).json({ message: "Solo barberos, administradores u owners pueden crear reservas para clientes" });
        }

        if (!userId || !barbershop || !serviceId || !date || !time) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }

        if (!resolvedBarberId) {
            if (staffRole === "barber") {
                resolvedBarberId = staffId;
            } else {
                const recommendation = await recommendBarberForBooking({
                    barbershopId: barbershop,
                    serviceId,
                    date,
                    preferredTime: time
                });

                if (!recommendation.recommended?.matchingSlot) {
                    return res.status(400).json({ message: "No hay un barbero disponible para ese servicio y horario" });
                }

                resolvedBarberId = recommendation.recommended.barber.id;
            }
        }

        // Validar barbero
        const dataBarber = await User.findByPk(resolvedBarberId);
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
        if (dataBarber.barbershopId !== barbershop) {
            return res.status(400).json({ message: "El barbero no pertenece a la barbería seleccionada" });
        }
        if (staffRole === 'owner' && barbershopData.ownerId !== staffId) {
            return res.status(403).json({ message: "No puedes crear reservas para otra barbería" });
        }
        if (staffRole === 'barber' && dataBarber.id !== staffId) {
            return res.status(403).json({ message: "Solo puedes crear reservas para tu propia agenda" });
        }

        const clientAssignment = await ensureClientAssignmentForBarbershop({
            client: clientData,
            barbershopId: barbershop,
            actorRole: staffRole,
            allowAdminOverride: true
        });
        if (!clientAssignment.assigned) {
            return res.status(403).json({
                message: "El cliente ya está asociado a otra barbería y no puede reservar en esta"
            });
        }

        // Obtener servicio y precio usando la función helper
        try {
            const { service: selectedService, price: servicePrice, serviceSource } = await getServiceAndPrice(serviceId, resolvedBarberId, barbershop);
            const { name: serviceName, duration } = selectedService;
            const price = servicePrice;

        // Calcular tiempos
        const localStart = getLocalDateTime(date, time);
        const leadTimeError = validateBookingLeadTime(localStart);
        if (leadTimeError) return res.status(400).json({ message: leadTimeError });

        const localEnd = localStart.plus({ minutes: selectedService.duration });
        const startTime = localStart.toUTC().toJSDate();
        const endTime = localEnd.toUTC().toJSDate();

        // Validar bloqueos de disponibilidad del barbero
            const overlappingBlock = await AvailabilityBlock.findOne({
                where: buildAvailabilityBlockWhere({
                    barberId: resolvedBarberId,
                    barbershopId: barbershop,
                    startTime,
                    endTime
                })
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
        const overlappingBooking = await hasBufferedBookingConflict({
            barberId: resolvedBarberId,
            startTime,
            endTime
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "Ya existe una reserva en este rango de tiempo" });
        }

        // Validar horario del barbero
        const workingWindow = resolveBarberWorkingWindow({
            localDate: localStart,
            barber: dataBarber,
            barbershop: barbershopData
        });
        if (!workingWindow) {
            return res.status(400).json({ message: `No hay horario disponible para el barbero ese día` });
        }

        if (localStart < workingWindow.windowStart || localEnd > workingWindow.windowEnd) {
            return res.status(400).json({
                message: `El barbero solo trabaja entre ${workingWindow.startLabel} y ${workingWindow.endLabel}`
            });
        }

            // Crear reserva
            const booking = await Booking.create({
                userId: userId,
                barberId: resolvedBarberId,
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
            appendBookingHistory(booking, {
                type: "created_by_staff",
                actorId: staffId,
                actorRole: staffRole,
                status: booking.status,
                assignmentMode: wasAutoAssigned ? "auto" : "manual"
            });
            await booking.save();

            // Cargar relaciones para respuesta
            await booking.reload({
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "email"] },
                    { model: User, as: "barber", attributes: ["id", "name"] },
                    { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
                ]
            });

            triggerBookingNotification(booking.id, "booking_created", {
                status: booking.status,
                createdByRole: staffRole
            });
            res.status(201).json({ 
                message: "Reserva creada correctamente para el cliente", 
                booking: serializeBooking(booking)
            });

        } catch (serviceError) {
            return res.status(404).json({ message: serviceError.message });
        }

    } catch (err) {
        handleError(res, 'Error al crear la reserva para el cliente', 500, err);
    }
};

// Modificar barbero de una reserva (admin global u owner de la barbería)
const changeBookingBarber = async (req, res) => {
    try {
        const { id } = req.params;
        const { newBarberId } = req.body;
        const userRole = req.user.role;

        if (!['admin', 'owner'].includes(userRole)) {
            return res.status(403).json({ message: "Solo el administrador de la barbería puede modificar el barbero de una reserva" });
        }

        if (!newBarberId) {
            return res.status(400).json({ message: "El nuevo barbero es obligatorio" });
        }

        const booking = await Booking.findByPk(id);
        if (!booking) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        if (userRole === 'owner') {
            const ownerShopIds = await getOwnerBarbershopIds(req.user.id);
            if (!ownerShopIds.includes(booking.barbershopId)) {
                return res.status(403).json({ message: "No autorizado para modificar reservas de otra barbería" });
            }
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
        if (newBarber.barbershopId !== booking.barbershopId) {
            return res.status(400).json({ message: "El nuevo barbero debe pertenecer a la misma barbería" });
        }

        // Validar que el nuevo barbero trabaje en la fecha y hora de la reserva
        const localStart = getLocalDateTime(booking.date, booking.time);
        const barbershop = await Barbershop.findByPk(booking.barbershopId);
        const workingWindow = resolveBarberWorkingWindow({
            localDate: localStart,
            barber: newBarber,
            barbershop
        });
        if (!workingWindow) {
            return res.status(400).json({ message: `No hay horario disponible para el nuevo barbero ese día` });
        }

        if (localStart < workingWindow.windowStart || localStart.plus({ minutes: booking.serviceDuration }) > workingWindow.windowEnd) {
            return res.status(400).json({
                message: `El nuevo barbero no está disponible en ese horario`
            });
        }

        // Validar que no haya conflictos con el nuevo barbero
        const overlappingBooking = await hasBufferedBookingConflict({
            barberId: newBarberId,
            startTime: booking.startTime,
            endTime: booking.endTime,
            excludeBookingId: booking.id
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "El nuevo barbero ya tiene una reserva en ese horario" });
        }

        // Validar bloqueos de disponibilidad del nuevo barbero
        const overlappingBlock = await AvailabilityBlock.findOne({
            where: buildAvailabilityBlockWhere({
                barberId: newBarberId,
                barbershopId: booking.barbershopId,
                startTime: booking.startTime,
                endTime: booking.endTime
            })
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
        appendBookingHistory(booking, {
            type: "barber_changed",
            actorId: req.user.id,
            actorRole: userRole,
            oldBarberId,
            newBarberId,
            status: booking.status
        });
        await booking.save();

        // Cargar relaciones para respuesta
        await booking.reload({
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                { model: User, as: "barber", attributes: ["id", "name"] },
                { model: Barbershop, as: "barbershop", attributes: ["id", "name", "address"] }
            ]
        });

        triggerBookingNotification(booking.id, "booking_barber_changed", {
            oldBarberId,
            newBarberId
        });
        res.json({ 
            message: "Barbero de la reserva actualizado correctamente", 
            booking: serializeBooking(booking),
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
        } else if (role === 'owner') {
            const ownerShopIds = await getOwnerBarbershopIds(userId);
            if (ownerShopIds.length === 0) {
                return res.status(200).json({ bookings: [], lastUpdate: new Date().toISOString(), totalCount: 0 });
            }
            where.barbershopId = { [Op.in]: ownerShopIds };
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
            bookings: serializeBookings(bookings),
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
        } else if (role === 'owner') {
            const ownerShopIds = await getOwnerBarbershopIds(userId);
            if (ownerShopIds.length === 0) {
                return res.json({
                    stats: {
                        pending: 0,
                        confirmed: 0,
                        cancelled: 0,
                        completed: 0,
                        totalRevenue: 0,
                        totalBookings: 0
                    },
                    lastUpdate: new Date().toISOString()
                });
            }
            where.barbershopId = { [Op.in]: ownerShopIds };
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

        let resolvedBarberId = staffRole === 'barber' ? staffId : barberIdInput;
        let barber = resolvedBarberId ? await User.findByPk(resolvedBarberId) : null;
        let barbershop = barber?.barbershopId ? await Barbershop.findByPk(barber.barbershopId) : null;

        if (!resolvedBarberId) {
            return res.status(400).json({ message: "Barbero es obligatorio para crear una reserva walk-in" });
        }

        // Validar barbero
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Obtener barbería del barbero
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
            const localStart = getLocalDateTime(date, time);
            const leadTimeError = validateBookingLeadTime(localStart);
            if (leadTimeError) return res.status(400).json({ message: leadTimeError });

            const localEnd = localStart.plus({ minutes: selectedService.duration });
            const startTime = localStart.toUTC().toJSDate();
            const endTime = localEnd.toUTC().toJSDate();

            // Validar bloqueos de disponibilidad del barbero
            const overlappingBlock = await AvailabilityBlock.findOne({
                where: buildAvailabilityBlockWhere({
                    barberId: resolvedBarberId,
                    barbershopId: barbershop.id,
                    startTime,
                    endTime
                })
            });

            if (overlappingBlock) {
                return res.status(400).json({
                    message: `No se puede crear la reserva porque hay un bloqueo de disponibilidad: ${overlappingBlock.reason}`
                });
            }

            // Validar solapamientos
            const overlapping = await hasBufferedBookingConflict({
                barberId: resolvedBarberId,
                startTime,
                endTime
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
            appendBookingHistory(booking, {
                type: "walk_in_created",
                actorId: resolvedBarberId,
                actorRole: staffRole,
                status: booking.status
            });
            await booking.save();

            triggerBookingNotification(booking.id, "booking_walk_in_created", {
                createdByRole: staffRole
            });
            res.status(201).json({ 
                message: "Reserva walk-in creada exitosamente", 
                booking: serializeBooking({
                    ...booking.get({ plain: true }),
                    walkInClient: tempClient
                })
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
    getRecommendedBarber,
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
