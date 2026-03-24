const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const { randomUUID } = require("crypto");

// Obtener todos los servicios disponibles para un barbero (barbería + personalizados)
const getBarberServices = async (req, res) => {
    try {
        const barberId = req.user.id;
        const barber = await User.findByPk(barberId);
        
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const barbershop = barber.barbershopId ? await Barbershop.findByPk(barber.barbershopId) : null;
        
        // Servicios de la barbería (solo los activados por el barbero)
        const barbershopServices = (barbershop?.services || []).map(service => {
            const serviceId = service.id || service._id;
            const customPrice = barber.customPrices?.[serviceId];
            return {
                _id: serviceId,
                name: service.name,
                description: service.description,
                price: customPrice ? customPrice.price : service.price,
                duration: service.duration,
                category: service.category,
                isActive: customPrice ? customPrice.isActive : false,
                isRequired: service.isRequired,
                source: 'barbershop', // Indica que viene de la barbería
                hasCustomPrice: !!customPrice
            };
        });

        // Servicios personalizados del barbero
        const customServices = (barber.customServices || []).map(service => ({
            _id: service._id || service.id,
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
            barbershop: barbershop
                ? {
                    _id: barbershop.id,
                    name: barbershop.name
                }
                : null,
            barber: {
                _id: barber.id,
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

        const barbershop = await Barbershop.findByPk(barbershopId);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        let services = [];

        if (barberId) {
            // Servicios específicos de un barbero
            const barber = await User.findByPk(barberId);
            
            if (!barber || barber.role !== 'barber' || barber.barbershopId?.toString() !== barbershopId) {
                return res.status(404).json({ message: "Barbero no encontrado en esta barbería" });
            }

            // Servicios de la barbería (con precios personalizados si existen)
            const barbershopServices = barbershop.services
                .filter(service => service.isActive)
                .map(service => {
                    const serviceId = service.id || service._id;
                    const customPrice = barber.customPrices?.[serviceId];
                    if (!customPrice || !customPrice.isActive) return null;
                    return {
                        _id: serviceId,
                        name: service.name,
                        description: service.description,
                        price: customPrice ? customPrice.price : service.price,
                        duration: service.duration,
                        category: service.category,
                        source: 'barbershop',
                        hasCustomPrice: !!customPrice
                    };
                })
                .filter(Boolean);

            // Servicios personalizados del barbero
            const customServices = barber.customServices
                .filter(service => service.isActive)
                .map(service => ({
                    _id: service._id || service.id,
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    duration: service.duration,
                    category: service.category,
                    source: 'custom'
                }));

            services = [...barbershopServices, ...customServices];
        } else {
            // Servicios generales de la barbería (sin barbero específico)
            services = barbershop.services
                .filter(service => service.isActive)
                .map(service => ({
                    _id: service.id || service._id,
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

        if (!name || price === undefined || duration === undefined) {
            return res.status(400).json({ message: "Nombre, precio y duración son obligatorios" });
        }

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Verificar que no exista un servicio con el mismo nombre
        const existingService = (barber.customServices || []).find(service => 
            service.name.toLowerCase() === name.toLowerCase()
        );

        if (existingService) {
            return res.status(400).json({ message: "Ya existe un servicio personalizado con este nombre" });
        }

        const id = randomUUID();
        const newService = {
            id,
            _id: id,
            name,
            description: description || '',
            price,
            duration,
            category: category || 'other',
            isActive: true
        };

        const customServices = barber.customServices || [];
        customServices.push(newService);
        barber.customServices = customServices;
        await barber.save();

        const createdService = newService;

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

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const customServices = barber.customServices || [];
        const serviceIndex = customServices.findIndex(s => (s.id || s._id) === serviceId);
        if (serviceIndex === -1) {
            return res.status(404).json({ message: "Servicio personalizado no encontrado" });
        }

        // Actualizar campos si se proporcionan
        const service = { ...customServices[serviceIndex] };
        if (name !== undefined) service.name = name;
        if (description !== undefined) service.description = description;
        if (price !== undefined) service.price = price;
        if (duration !== undefined) service.duration = duration;
        if (category !== undefined) service.category = category;
        if (isActive !== undefined) service.isActive = isActive;
        customServices[serviceIndex] = service;
        barber.customServices = customServices;

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

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const customServices = barber.customServices || [];
        const exists = customServices.some(s => (s.id || s._id) === serviceId);
        if (!exists) {
            return res.status(404).json({ message: "Servicio personalizado no encontrado" });
        }

        barber.customServices = customServices.filter(s => (s.id || s._id) !== serviceId);
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

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        // Verificar que el servicio existe en la barbería
        const barbershop = barber.barbershopId ? await Barbershop.findByPk(barber.barbershopId) : null;
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const services = barbershop.services || [];
        const service = services.find(s => (s.id || s._id) === serviceId);
        if (!service) {
            return res.status(404).json({ message: "Servicio de barbería no encontrado" });
        }

        // Establecer precio personalizado
        const customPrices = { ...(barber.customPrices || {}) };
        customPrices[serviceId] = {
            price,
            isActive: isActive !== undefined ? isActive : true
        };
        barber.customPrices = customPrices;

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

        const barber = await User.findByPk(barberId);
        if (!barber || barber.role !== 'barber') {
            return res.status(404).json({ message: "Barbero no encontrado" });
        }

        const customPrices = { ...(barber.customPrices || {}) };
        if (!customPrices[serviceId]) {
            return res.status(404).json({ message: "Precio personalizado no encontrado" });
        }

        delete customPrices[serviceId];
        barber.customPrices = customPrices;
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
