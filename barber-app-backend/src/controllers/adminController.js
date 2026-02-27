const Booking = require("../models/Booking");
const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const { DateTime } = require("luxon");
const { Op } = require("sequelize");

const getOwnerBarbershopIds = async (ownerId) => {
    const shops = await Barbershop.findAll({ where: { ownerId }, attributes: ["id"] });
    return shops.map(s => s.id);
};

// Endpoint temporal para cambiar roles
const changeUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['client', 'barber', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        user.role = role;
        await user.save();

        res.json({ 
            message: 'Rol actualizado exitosamente', 
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        handleError(res, 'Error al cambiar rol', 500, error);
    }
};

// Endpoint temporal para crear barberías
const createBarbershop = async (req, res) => {
    try {
        const { name, address, phone, location, owner, ownerId, services, openingHours, description, isActive } = req.body;
        const resolvedOwnerId = ownerId || owner;

        // Validar que el propietario existe y es barber
        const barber = await User.findByPk(resolvedOwnerId);
        if (!barber || barber.role !== 'barber') {
            return res.status(400).json({ message: 'El propietario debe ser un barbero válido' });
        }

        // Verificar que no tenga barbería ya
        const existingBarbershop = await Barbershop.findOne({ where: { ownerId: resolvedOwnerId } });
        if (existingBarbershop) {
            return res.status(400).json({ message: 'Este barbero ya tiene una barbería asociada' });
        }

        const barbershop = new Barbershop({
            name,
            address: address || location,
            phone,
            location: location || address,
            ownerId: resolvedOwnerId,
            services: services || [],
            openingHours: openingHours || { openHour: 9, closeHour: 18 },
            description: description || null,
            isActive: isActive !== undefined ? isActive : true
        });

        await barbershop.save();

        res.status(201).json({ 
            message: 'Barbería creada exitosamente', 
            barbershop: {
                id: barbershop.id,
                name: barbershop.name,
                address: barbershop.address,
                ownerId: barbershop.ownerId,
                services: barbershop.services.length
            }
        });
    } catch (error) {
        console.error('Error al crear barbería:', error);
        handleError(res, 'Error al crear barbería', 500, error);
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const { from, to, barbershopId, barberId } = req.query;
        const role = req.user?.role;

        const filters = {};
        let ownerShopIds = null;

        if (role === 'owner') {
            ownerShopIds = await getOwnerBarbershopIds(req.user.id);
            if (ownerShopIds.length === 0) {
                return res.json({
                    totalUsers: 0,
                    activeBarbers: 0,
                    todayAppointments: 0,
                    monthlyRevenue: 0,
                    growthRate: 0,
                    totalBookings: 0,
                    bookingsPerDay: {},
                    bookingsPerBarber: {},
                    bookingsPerBarbershop: {},
                    timeFrequency: {},
                    estimatedRevenue: 0,
                });
            }
            filters.barbershopId = { [Op.in]: ownerShopIds };
        }

        // Filtro por fechas
        if (from || to) {
            const dateFilter = {};
            if (from) dateFilter[Op.gte] = DateTime.fromISO(from).toISODate();
            if (to) dateFilter[Op.lte] = DateTime.fromISO(to).toISODate();
            filters.date = dateFilter;
        }

        // Filtro por barbería
        if (barbershopId) {
            if (ownerShopIds && !ownerShopIds.includes(barbershopId)) {
                return res.status(403).json({ message: 'Acceso denegado a esta barbería' });
            }
            filters.barbershopId = barbershopId;
        }

        // Filtro por barbero
        if (barberId) {
            filters.barberId = barberId;
        }

        // Obtener todas las reservas que cumplen los filtros
        const bookings = await Booking.findAll({ where: filters });

        const totalUsers = await User.count({ where: ownerShopIds ? { barbershopId: { [Op.in]: ownerShopIds } } : undefined });
        const activeBarbers = await User.count({ where: { role: "barber", isActive: true, ...(ownerShopIds ? { barbershopId: { [Op.in]: ownerShopIds } } : {}) } });

        const today = DateTime.now().toISODate();
        const todayAppointments = await Booking.count({
            where: {
                date: today,
                status: { [Op.in]: ["pending", "confirmed"] },
                ...(ownerShopIds ? { barbershopId: { [Op.in]: ownerShopIds } } : {})
            }
        });

        const monthStart = DateTime.now().startOf("month").toISODate();
        const monthEnd = DateTime.now().endOf("month").toISODate();
        const monthlyRevenueRows = await Booking.findAll({
            where: {
                date: { [Op.between]: [monthStart, monthEnd] },
                status: { [Op.in]: ["confirmed", "completed"] },
                ...(ownerShopIds ? { barbershopId: { [Op.in]: ownerShopIds } } : {})
            },
            attributes: [[Booking.sequelize.fn("SUM", Booking.sequelize.col("servicePrice")), "total"]]
        });
        const monthlyRevenue = Number(monthlyRevenueRows?.[0]?.get("total") || 0);

        const prevMonthStart = DateTime.now().minus({ months: 1 }).startOf("month").toISODate();
        const prevMonthEnd = DateTime.now().minus({ months: 1 }).endOf("month").toISODate();
        const prevMonthRows = await Booking.findAll({
            where: {
                date: { [Op.between]: [prevMonthStart, prevMonthEnd] },
                status: { [Op.in]: ["confirmed", "completed"] },
                ...(ownerShopIds ? { barbershopId: { [Op.in]: ownerShopIds } } : {})
            },
            attributes: [[Booking.sequelize.fn("SUM", Booking.sequelize.col("servicePrice")), "total"]]
        });
        const prevMonthRevenue = Number(prevMonthRows?.[0]?.get("total") || 0);
        const growthRate = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

        // Total de reservas por día
        const bookingsPerDay = {};
        const bookingsPerBarber = {};
        const bookingsPerBarbershop = {};
        const timeFrequency = {};
        let estimatedRevenue = 0;

        bookings.forEach((booking) => {
            const { date, barberId, barbershopId, startTime, servicePrice, status } = booking;

            // Validaciones básicas
            if (!date || !barberId || !barbershopId || !startTime) return;

            const validDate = DateTime.fromISO(date);
            if (!validDate.isValid) return;

            const day = validDate.toISODate(); // YYYY-MM-DD
            const barberIdStr = barberId?.toString?.() || "unknown";
            const barbershopIdStr = barbershopId?.toString?.() || "unknown";

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
            totalUsers,
            activeBarbers,
            todayAppointments,
            monthlyRevenue,
            growthRate,
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

// Obtener top barberos del mes
const getTopBarbers = async (req, res) => {
    try {
        const { month, year, barbershopId } = req.query;
        const role = req.user?.role;
        let ownerShopIds = null;
        
        // Calcular fechas del mes
        const startDate = month && year 
            ? DateTime.fromObject({ year: parseInt(year), month: parseInt(month) }).startOf('month').toISODate()
            : DateTime.now().startOf('month').toISODate();
        
        const endDate = month && year 
            ? DateTime.fromObject({ year: parseInt(year), month: parseInt(month) }).endOf('month').toISODate()
            : DateTime.now().endOf('month').toISODate();

        // Construir filtros
        const filters = {
            date: { [Op.between]: [startDate, endDate] },
            status: { [Op.in]: ['confirmed', 'completed'] }
        };

        // Agregar filtro de barbería si se especifica
        if (role === 'owner') {
            ownerShopIds = await getOwnerBarbershopIds(req.user.id);
            if (ownerShopIds.length === 0) return res.json([]);
            filters.barbershopId = { [Op.in]: ownerShopIds };
        }

        if (barbershopId) {
            if (ownerShopIds && !ownerShopIds.includes(barbershopId)) {
                return res.status(403).json({ message: 'Acceso denegado a esta barbería' });
            }
            filters.barbershopId = barbershopId;
        }

        // Obtener reservas del mes
        const bookings = await Booking.findAll({ where: filters });

        const barberIds = Array.from(new Set(bookings.map(b => b.barberId).filter(Boolean)));
        const barbers = await User.findAll({ where: { id: barberIds }, attributes: ["id", "name"] });
        const barbersMap = new Map(barbers.map(b => [b.id, b]));
        const barbershopIds = Array.from(new Set(bookings.map(b => b.barbershopId).filter(Boolean)));
        const shops = await Barbershop.findAll({ where: { id: barbershopIds }, attributes: ["id", "location"] });
        const shopsMap = new Map(shops.map(s => [s.id, s]));

        const barberStats = {};
        bookings.forEach(booking => {
            const barberId = booking.barberId?.toString?.();
            if (!barberId) return;
            if (!barberStats[barberId]) {
                const barber = barbersMap.get(booking.barberId);
                const shop = shopsMap.get(booking.barbershopId);
                barberStats[barberId] = {
                    _id: barberId,
                    name: barber?.name || "Desconocido",
                    appointments: 0,
                    revenue: 0,
                    rating: 0,
                    location: shop?.location || 'No especificada'
                };
            }
            barberStats[barberId].appointments += 1;
            barberStats[barberId].revenue += Number(booking.servicePrice || 0);
        });

        // Convertir a array y ordenar por citas
        const topBarbers = Object.values(barberStats)
            .sort((a, b) => b.appointments - a.appointments)
            .slice(0, 10);

        res.json(topBarbers);
    } catch (error) {
        console.error('Error getting top barbers:', error);
        res.status(500).json({ message: 'Error al obtener top barberos', error: error.message });
    }
};

// Obtener datos mensuales para resumen
const getMonthlyData = async (req, res) => {
    try {
        const { year, barbershopId } = req.query;
        const role = req.user?.role;
        let ownerShopIds = null;
        const targetYear = year ? parseInt(year) : DateTime.now().year;
        
        const monthlyData = [];
        
        for (let month = 1; month <= 12; month++) {
            const startDate = DateTime.fromObject({ year: targetYear, month }).startOf('month').toISODate();
            const endDate = DateTime.fromObject({ year: targetYear, month }).endOf('month').toISODate();
            
            // Construir filtros
            const filters = {
                date: { [Op.between]: [startDate, endDate] },
                status: { [Op.in]: ['confirmed', 'completed'] }
            };

            // Agregar filtro de barbería si se especifica
            if (role === 'owner') {
                ownerShopIds = ownerShopIds || await getOwnerBarbershopIds(req.user.id);
                if (ownerShopIds.length === 0) return res.json([]);
                filters.barbershopId = { [Op.in]: ownerShopIds };
            }

            if (barbershopId) {
                if (ownerShopIds && !ownerShopIds.includes(barbershopId)) {
                    return res.status(403).json({ message: 'Acceso denegado a esta barbería' });
                }
                filters.barbershopId = barbershopId;
            }
            
            const bookings = await Booking.findAll({ where: filters });
            
            const revenue = bookings.reduce((sum, booking) => sum + (booking.servicePrice || 0), 0);
            const appointments = bookings.length;
            
            monthlyData.push({
                month: DateTime.fromObject({ year: targetYear, month }).toFormat('MMM'),
                appointments,
                revenue,
                growth: month > 1 ? 
                    ((appointments - (monthlyData[month-2]?.appointments || 0)) / Math.max(monthlyData[month-2]?.appointments || 1, 1) * 100) : 0
            });
        }
        
        res.json(monthlyData);
    } catch (error) {
        console.error('Error getting monthly data:', error);
        res.status(500).json({ message: 'Error al obtener datos mensuales', error: error.message });
    }
};

// Crear usuario
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, barbershop, phone, isActive = true } = req.body;
        const requesterRole = req.user?.role;

        // Validar campos requeridos
        if (!name || !email || !password || !role) {
            return res.status(400).json({ 
                message: 'Nombre, email, contraseña y rol son requeridos' 
            });
        }

        if (requesterRole === 'owner' && !['barber', 'client'].includes(role)) {
            return res.status(403).json({ message: 'El owner solo puede crear barberos o clientes' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Ya existe un usuario con este email' 
            });
        }

        // Validar barbería si aplica
        let resolvedBarbershopId = barbershop;
        if (requesterRole === 'owner') {
            const ownerShops = await getOwnerBarbershopIds(req.user.id);
            if (ownerShops.length === 0) {
                return res.status(400).json({ message: 'Owner sin barbería asociada' });
            }
            resolvedBarbershopId = ownerShops[0];
        }

        if (role === 'barber' && resolvedBarbershopId) {
            const shop = await Barbershop.findByPk(resolvedBarbershopId);
            if (!shop) {
                return res.status(400).json({ message: 'Barbería no válida' });
            }
        }

        // Crear nuevo usuario
        const user = await User.create({
            name,
            email,
            password,
            role,
            barbershopId: role === 'barber' ? resolvedBarbershopId : undefined,
            phone,
            isActive
        });

        // No devolver la contraseña
        const userResponse = user.get({ plain: true });
        delete userResponse.password;

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: userResponse
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Actualizar usuario
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, barbershop, phone, isActive } = req.body;
        const normalizedBarbershop = barbershop ? barbershop : null;
        const requesterRole = req.user?.role;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ 
                message: 'Usuario no encontrado' 
            });
        }

        if (requesterRole === 'owner') {
            const ownerShops = await getOwnerBarbershopIds(req.user.id);
            if (ownerShops.length === 0) return res.status(403).json({ message: 'Owner sin barbería asociada' });
            const targetShopId = user.barbershopId;
            if (targetShopId && !ownerShops.includes(targetShopId)) {
                return res.status(403).json({ message: 'No puedes modificar usuarios de otra barbería' });
            }
            if (role && !['barber', 'client'].includes(role)) {
                return res.status(403).json({ message: 'El owner solo puede asignar roles barber o client' });
            }
        }

        // Actualizar campos
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;

        if (role === 'barber') {
            if (normalizedBarbershop) {
                const shop = await Barbershop.findByPk(normalizedBarbershop);
                if (!shop) {
                    return res.status(400).json({ message: 'Barbería no válida' });
                }
            }
            if (barbershop !== undefined) user.barbershopId = normalizedBarbershop;
        } else if (role !== undefined) {
            user.barbershopId = null;
        } else if (barbershop !== undefined) {
            user.barbershopId = normalizedBarbershop;
        }
        if (role !== undefined && role !== 'barber' && barbershop === undefined) {
            user.barbershopId = null;
        }
        if (phone !== undefined) user.phone = phone;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        // No devolver la contraseña
        const userResponse = user.get({ plain: true });
        delete userResponse.password;

        res.json({
            message: 'Usuario actualizado exitosamente',
            user: userResponse
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterRole = req.user?.role;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ 
                message: 'Usuario no encontrado' 
            });
        }

        if (requesterRole === 'owner') {
            const ownerShops = await getOwnerBarbershopIds(req.user.id);
            if (ownerShops.length === 0) return res.status(403).json({ message: 'Owner sin barbería asociada' });
            const targetShopId = user.barbershopId;
            if (targetShopId && !ownerShops.includes(targetShopId)) {
                return res.status(403).json({ message: 'No puedes eliminar usuarios de otra barbería' });
            }
            if (user.role === 'admin' || user.role === 'owner') {
                return res.status(403).json({ message: 'No puedes eliminar administradores/owners' });
            }
        }

        // Verificar que no sea el último admin
        if (user.role === 'admin') {
            const adminCount = await User.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ 
                    message: 'No se puede eliminar el último administrador' 
                });
            }
        }

        await user.destroy();

        res.json({ 
            message: 'Usuario eliminado exitosamente' 
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Listar usuarios (admin/owner)
const listUsersAdmin = async (req, res) => {
    try {
        const { role, barbershop, isActive } = req.query;
        const requesterRole = req.user?.role;
        const where = {};

        let ownerShopIds = null;
        if (requesterRole === 'owner') {
            ownerShopIds = await getOwnerBarbershopIds(req.user.id);
            if (ownerShopIds.length === 0) return res.json([]);
            where.barbershopId = { [Op.in]: ownerShopIds };
        }

        if (role) where.role = role;
        if (barbershop) {
            if (ownerShopIds && !ownerShopIds.includes(barbershop)) {
                return res.status(403).json({ message: 'Acceso denegado a esta barbería' });
            }
            where.barbershopId = barbershop;
        }
        if (typeof isActive !== 'undefined') where.isActive = isActive === 'true';

        const users = await User.findAll({
            where,
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
            include: [{ model: Barbershop, as: "barbershop", attributes: ["id", "name", "location"] }]
        });
        res.json(users);
    } catch (err) {
        handleError(res, 'Error al listar usuarios', 500, err);
    }
};

// Listar barberías (admin/owner)
const listBarbershopsAdmin = async (req, res) => {
    try {
        const requesterRole = req.user?.role;
        const where = {};
        if (requesterRole === 'owner') {
            where.ownerId = req.user.id;
        }
        const barbershops = await Barbershop.findAll({
            where,
            include: [
                { model: User, as: "owner", attributes: ["id", "name", "email"] },
                { model: User, as: "barbers", attributes: ["id", "name"] }
            ]
        });
        res.json(barbershops);
    } catch (err) {
        handleError(res, 'Error al listar barberías', 500, err);
    }
};

module.exports = {
    getDashboardStats,
    getTopBarbers,
    getMonthlyData,
    listUsersAdmin,
    listBarbershopsAdmin,
    createUser,
    updateUser,
    deleteUser,
    changeUserRole,
    createBarbershop
};
