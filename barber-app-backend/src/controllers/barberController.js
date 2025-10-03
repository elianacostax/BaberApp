const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const Review = require('../models/Review');
const { handleError } = require('../utils/errorHandler');

// Obtener lista de barberos con información completa
const getBarbers = async (req, res) => {
    try {
        // Obtener todos los barberos con información de barbería
        const barbers = await User.find({ 
            role: 'barber',
            barbershop: { $exists: true, $ne: null } // Solo barberos con barbería asignada
        })
            .populate('barbershop', 'name address location')
            .select('-password -__v -resetPasswordToken -resetPasswordExpires');

        // Agregar información adicional como rating, reviewCount, etc.
        const barbersWithStats = await Promise.all(
            barbers.map(async (barber) => {
                // Calcular rating promedio y conteo de reseñas
                const reviews = await Review.find({ barber: barber._id });
                const rating = reviews.length > 0 
                    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
                    : 0;

                // Determinar disponibilidad basada en horario actual
                const now = new Date();
                const dayOfWeek = now.getDay().toString();
                const currentTime = now.toTimeString().slice(0, 5);
                
                const todaySchedule = barber.schedule?.get(dayOfWeek);
                let isAvailable = false;
                
                if (todaySchedule && todaySchedule.start && todaySchedule.end) {
                    isAvailable = currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
                }

                // Obtener servicios del barbero (barbería + personalizados)
                let services = [];
                
                // Servicios de la barbería
                if (barber.barbershop) {
                    const barbershop = await Barbershop.findById(barber.barbershop._id);
                    if (barbershop && barbershop.services) {
                        barbershop.services.forEach(shopService => {
                            const customPriceEntry = barber.customPrices?.get(shopService._id.toString());
                            services.push({
                                _id: shopService._id,
                                name: shopService.name,
                                price: customPriceEntry && customPriceEntry.isActive ? customPriceEntry.price : shopService.price,
                                duration: shopService.duration,
                                category: shopService.category,
                                isActive: customPriceEntry ? customPriceEntry.isActive : shopService.isActive,
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
                                _id: customService._id,
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
                    _id: barber._id,
                    name: barber.name,
                    email: barber.email,
                    phone: barber.phone,
                    specialty: barber.specialty || 'Barbero Profesional',
                    rating: Math.round(rating * 10) / 10, // Redondear a 1 decimal
                    reviewCount: reviews.length,
                    experience: barber.experience || 1,
                    barbershop: barber.barbershop,
                    services: services,
                    schedule: barber.schedule ? Object.fromEntries(barber.schedule) : {},
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

module.exports = {
    getBarbers,
    getBarberLocations
};
