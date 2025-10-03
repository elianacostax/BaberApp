const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");

// Obtener todos los servicios disponibles para un barbero (barbería + personalizados)
const getBarberServices = async (req, res) => {
    try {
        const barberId = req.user.id;
        const barber = await User.findById(barberId).populate('barbershop');
        
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        if (!barber.barbershop) {
            return res.status(400).json({ message: "El barbero no está asignado a ninguna barbería" });
        }

        const barbershop = barber.barbershop;
        
        // Servicios de la barbería (con precios personalizados si existen)
        const barbershopServices = barbershop.services.map(service => {
            const customPrice = barber.customPrices.get(service._id.toString());
            return {
                _id: service._id,
                name: service.name,
                description: service.description,
                price: customPrice ? customPrice.price : service.price,
                duration: service.duration,
                category: service.category,
                isActive: customPrice ? customPrice.isActive : service.isActive,
                isRequired: service.isRequired,
                source: 'barbershop', // Indica que viene de la barbería
                hasCustomPrice: !!customPrice
            };
        });

        // Servicios personalizados del barbero
        const customServices = barber.customServices.map(service => ({
            _id: service._id,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: service.category,
            isActive: service.isActive,
            isRequired: false,
            source: 'custom' // Indica que es personalizado
        }));

        // Combinar servicios
        const allServices = [...barbershopServices, ...customServices];

        res.json({
            services: allServices,
            barbershop: {
                _id: barbershop._id,
                name: barbershop.name
            },
            barber: {
                _id: barber._id,
                name: barber.name
            }
        });

    } catch (err) {
        handleError(res, 'Error al obtener servicios del barbero', 500, err);
    }
};

// Obtener servicios disponibles para reserva (cliente)
const getAvailableServices = async (req, res) => {
    try {
        const { barbershopId, barberId } = req.query;

        if (!barbershopId) {
            return res.status(400).json({ message: "ID de barbería es obligatorio" });
        }

        const barbershop = await Barbershop.findById(barbershopId);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        let services = [];

        if (barberId) {
            // Servicios específicos de un barbero
            const barber = await User.findById(barberId).populate('barbershop');
            
            if (!barber || barber.role !== 'barber' || barber.barbershop._id.toString() !== barbershopId) {
                return res.status(404).json({ message: "Barbero no encontrado en esta barbería" });
            }

            // Servicios de la barbería (con precios personalizados si existen)
            const barbershopServices = barbershop.services
                .filter(service => service.isActive)
                .map(service => {
                    const customPrice = barber.customPrices.get(service._id.toString());
                    return {
                        _id: service._id,
                        name: service.name,
                        description: service.description,
                        price: customPrice ? customPrice.price : service.price,
                        duration: service.duration,
                        category: service.category,
                        source: 'barbershop',
                        hasCustomPrice: !!customPrice
                    };
                });

            // Servicios personalizados del barbero
            const customServices = barber.customServices
                .filter(service => service.isActive)
                .map(service => ({
                    _id: service._id,
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    duration: service.duration,
                    category: service.category,
                    source: 'custom'
                }));

            services = [...barbershopServices, ...customServices];
        } else {
            // Servicios generales de la barbería
            services = barbershop.services
                .filter(service => service.isActive)
                .map(service => ({
                    _id: service._id,
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    duration: service.duration,
                    category: service.category,
                    source: 'barbershop'
                }));
        }

        res.json({ services });

    } catch (err) {
        handleError(res, 'Error al obtener servicios disponibles', 500, err);
    }
};

// Crear servicio personalizado para barbero
const createCustomService = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { name, description, price, duration, category } = req.body;

        if (!name || !price || !duration) {
            return res.status(400).json({ message: "Nombre, precio y duración son obligatorios" });
        }

        const barber = await User.findById(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Verificar que no exista un servicio con el mismo nombre
        const existingService = barber.customServices.find(service => 
            service.name.toLowerCase() === name.toLowerCase()
        );

        if (existingService) {
            return res.status(400).json({ message: "Ya existe un servicio personalizado con este nombre" });
        }

        const newService = {
            name,
            description: description || '',
            price,
            duration,
            category: category || 'other',
            isActive: true
        };

        barber.customServices.push(newService);
        await barber.save();

        const createdService = barber.customServices[barber.customServices.length - 1];

        res.status(201).json({
            message: "Servicio personalizado creado correctamente",
            service: createdService
        });

    } catch (err) {
        handleError(res, 'Error al crear servicio personalizado', 500, err);
    }
};

// Actualizar servicio personalizado
const updateCustomService = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { serviceId } = req.params;
        const { name, description, price, duration, category, isActive } = req.body;

        const barber = await User.findById(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const service = barber.customServices.id(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Servicio personalizado no encontrado" });
        }

        // Actualizar campos si se proporcionan
        if (name !== undefined) service.name = name;
        if (description !== undefined) service.description = description;
        if (price !== undefined) service.price = price;
        if (duration !== undefined) service.duration = duration;
        if (category !== undefined) service.category = category;
        if (isActive !== undefined) service.isActive = isActive;

        await barber.save();

        res.json({
            message: "Servicio personalizado actualizado correctamente",
            service
        });

    } catch (err) {
        handleError(res, 'Error al actualizar servicio personalizado', 500, err);
    }
};

// Eliminar servicio personalizado
const deleteCustomService = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { serviceId } = req.params;

        const barber = await User.findById(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const service = barber.customServices.id(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Servicio personalizado no encontrado" });
        }

        barber.customServices.pull(serviceId);
        await barber.save();

        res.json({ message: "Servicio personalizado eliminado correctamente" });

    } catch (err) {
        handleError(res, 'Error al eliminar servicio personalizado', 500, err);
    }
};

// Establecer precio personalizado para servicio de barbería
const setCustomPrice = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { serviceId } = req.params;
        const { price, isActive } = req.body;

        if (price === undefined || price < 0) {
            return res.status(400).json({ message: "Precio válido es obligatorio" });
        }

        const barber = await User.findById(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Verificar que el servicio existe en la barbería
        const barbershop = await Barbershop.findById(barber.barbershop);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const service = barbershop.services.id(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Servicio de barbería no encontrado" });
        }

        // Establecer precio personalizado
        barber.customPrices.set(serviceId, {
            price,
            isActive: isActive !== undefined ? isActive : true
        });

        await barber.save();

        res.json({
            message: "Precio personalizado establecido correctamente",
            service: {
                _id: serviceId,
                name: service.name,
                originalPrice: service.price,
                customPrice: price,
                isActive: isActive !== undefined ? isActive : true
            }
        });

    } catch (err) {
        handleError(res, 'Error al establecer precio personalizado', 500, err);
    }
};

// Eliminar precio personalizado
const removeCustomPrice = async (req, res) => {
    try {
        const barberId = req.user.id;
        const { serviceId } = req.params;

        const barber = await User.findById(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        if (!barber.customPrices.has(serviceId)) {
            return res.status(404).json({ message: "Precio personalizado no encontrado" });
        }

        barber.customPrices.delete(serviceId);
        await barber.save();

        res.json({ message: "Precio personalizado eliminado correctamente" });

    } catch (err) {
        handleError(res, 'Error al eliminar precio personalizado', 500, err);
    }
};

module.exports = {
    getBarberServices,
    getAvailableServices,
    createCustomService,
    updateCustomService,
    deleteCustomService,
    setCustomPrice,
    removeCustomPrice
};
