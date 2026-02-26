const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { Op } = require('sequelize');
const { handleError } = require('../utils/errorHandler');

// Obtener lista de barberos con información completa
const getBarbers = async (req, res) => {
    try {
        // Obtener todos los barberos con información de barbería
        const barbers = await User.findAll({
            where: {
                role: 'barber',
                barbershopId: { [Op.ne]: null }
            },
            include: [
                { model: Barbershop, as: 'barbershop', attributes: ['id', 'name', 'address', 'location'] }
            ],
            attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
        });

        // Agregar información adicional como rating, reviewCount, etc.
        const barbersWithStats = await Promise.all(
            barbers.map(async (barber) => {
                // Calcular rating promedio y conteo de reseñas
                const reviews = await Review.findAll({ where: { barberId: barber.id } });
                const rating = reviews.length > 0 
                    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
                    : 0;

                // Determinar disponibilidad basada en horario actual
                const now = new Date();
                const dayOfWeek = now.getDay().toString();
                const currentTime = now.toTimeString().slice(0, 5);
                
                const todaySchedule = barber.schedule?.[dayOfWeek];
                let isAvailable = false;
                
                if (todaySchedule && todaySchedule.start && todaySchedule.end) {
                    isAvailable = currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
                }

                // Obtener servicios del barbero (barbería + personalizados)
                let services = [];
                
                // Servicios de la barbería
                if (barber.barbershop) {
                    const barbershop = await Barbershop.findByPk(barber.barbershop.id);
                    if (barbershop && barbershop.services) {
                        barbershop.services.forEach(shopService => {
                            const serviceId = shopService.id || shopService._id;
                            const customPriceEntry = barber.customPrices?.[serviceId];
                            if (!customPriceEntry || !customPriceEntry.isActive) return;
                            services.push({
                                _id: serviceId,
                                name: shopService.name,
                                price: customPriceEntry.price,
                                duration: shopService.duration,
                                category: shopService.category,
                                isActive: true,
                                source: 'barbershop'
                            });
                        });
                    }
                }

                // Servicios personalizados del barbero
                if (barber.customServices && barber.customServices.length > 0) {
                    barber.customServices.forEach(customService => {
                        if (customService.isActive) {
                            services.push({
                                _id: customService._id || customService.id,
                                name: customService.name,
                                price: customService.price,
                                duration: customService.duration,
                                category: customService.category,
                                isActive: customService.isActive,
                                source: 'custom'
                            });
                        }
                    });
                }

                return {
                    _id: barber.id,
                    name: barber.name,
                    email: barber.email,
                    phone: barber.phone,
                    specialty: barber.specialty || 'Barbero Profesional',
                    rating: Math.round(rating * 10) / 10, // Redondear a 1 decimal
                    reviewCount: reviews.length,
                    experience: barber.experience || 1,
                    barbershop: barber.barbershop,
                    services: services,
                    schedule: barber.schedule || {},
                    isAvailable: isAvailable,
                    photo: barber.photo,
                    bio: barber.bio
                };
            })
        );

        res.json(barbersWithStats);
    } catch (err) {
        handleError(res, 'Error al obtener barberos', 500, err);
    }
};

// Obtener ubicaciones de barberías para filtros
const getBarberLocations = async (req, res) => {
    try {
        const locations = await Barbershop.distinct('location');
        res.json(locations);
    } catch (err) {
        handleError(res, 'Error al obtener ubicaciones', 500, err);
    }
};

// Obtener clientes de un barbero específico
const getBarberClients = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { search, sort } = req.query;

        // Verificar que el usuario es un barbero
        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        // Obtener todas las reservas del barbero
        const bookings = await Booking.findAll({
            where: { barberId },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            order: [['createdAt', 'DESC']]
        });

        // Agrupar por cliente y calcular estadísticas
        const clientMap = new Map();

        bookings.forEach(booking => {
            // Saltar reservas walk-in (sin usuario registrado)
            if (!booking.user) {
                return;
            }

            const userId = booking.user.id.toString();
            
            if (!clientMap.has(userId)) {
                clientMap.set(userId, {
                    _id: booking.user.id,
                    name: booking.user.name,
                    email: booking.user.email,
                    phone: booking.user.phone,
                    totalAppointments: 0,
                    totalSpent: 0,
                    lastAppointment: null,
                    appointments: []
                });
            }

            const client = clientMap.get(userId);
            client.totalAppointments += 1;
            client.totalSpent += Number(booking.servicePrice || 0);
            client.appointments.push(booking);

            // Actualizar última cita
            if (!client.lastAppointment || new Date(booking.date) > new Date(client.lastAppointment)) {
                client.lastAppointment = booking.date;
            }
        });

        // Convertir a array y calcular rating promedio
        let clients = Array.from(clientMap.values()).map(client => {
            // Calcular rating promedio basado en las reseñas
            const clientBookings = client.appointments.map(apt => apt.id);
            
            return {
                ...client,
                rating: 4.5, // Placeholder - se puede calcular con reseñas reales
                location: null // Placeholder - se puede obtener de la barbería
            };
        });

        // Aplicar filtro de búsqueda
        if (search) {
            const searchLower = search.toLowerCase();
            clients = clients.filter(client => 
                client.name.toLowerCase().includes(searchLower) ||
                client.email.toLowerCase().includes(searchLower) ||
                (client.phone && client.phone.includes(search))
            );
        }

        // Aplicar ordenamiento
        switch (sort) {
            case 'name':
                clients.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'lastAppointment':
                clients.sort((a, b) => new Date(b.lastAppointment) - new Date(a.lastAppointment));
                break;
            case 'totalAppointments':
                clients.sort((a, b) => b.totalAppointments - a.totalAppointments);
                break;
            case 'totalSpent':
                clients.sort((a, b) => b.totalSpent - a.totalSpent);
                break;
            case 'rating':
                clients.sort((a, b) => b.rating - a.rating);
                break;
            default:
                clients.sort((a, b) => a.name.localeCompare(b.name));
        }

        res.json(clients);
    } catch (error) {
        console.error('Error al obtener clientes del barbero:', error);
        handleError(res, 'Error al obtener clientes', 500, error);
    }
};

// Obtener servicios de un barbero
const getBarberServices = async (req, res) => {
    try {
        const barberId = req.user.id;

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        // Obtener barbería del barbero
        const barbershop = barber.barbershopId ? await Barbershop.findByPk(barber.barbershopId) : null;
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        // Combinar servicios de la barbería y servicios personalizados del barbero
        const services = [];

        // Servicios de la barbería
        if (barbershop.services && barbershop.services.length > 0) {
            barbershop.services.forEach(service => {
                const serviceId = service.id || service._id;
                const customPrice = barber.customPrices?.[serviceId];
                
                services.push({
                    _id: serviceId,
                    name: service.name,
                    price: customPrice?.isActive ? customPrice.price : service.price,
                    duration: service.duration,
                    description: service.description,
                    source: 'barbershop'
                });
            });
        }

        // Servicios personalizados del barbero
        if (barber.customServices && barber.customServices.length > 0) {
            barber.customServices.forEach(service => {
                services.push({
                    _id: service._id || service.id,
                    name: service.name,
                    price: service.price,
                    duration: service.duration,
                    description: service.description,
                    source: 'custom'
                });
            });
        }

        res.json(services);
    } catch (error) {
        console.error('Error al obtener servicios del barbero:', error);
        handleError(res, 'Error al obtener servicios', 500, error);
    }
};

module.exports = {
    getBarbers,
    getBarberLocations,
    getBarberClients,
    getBarberServices
};
