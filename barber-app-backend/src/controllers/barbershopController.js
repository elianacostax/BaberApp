const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const { randomUUID } = require("crypto");

const DEFAULT_SERVICES_TEMPLATE = [
    {
        name: "Corte",
        description: "Corte clásico de cabello",
        price: 150,
        duration: 30,
        category: "haircut",
        isActive: true,
        isRequired: false
    },
    {
        name: "Barba",
        description: "Perfilado y arreglo de barba",
        price: 120,
        duration: 20,
        category: "beard",
        isActive: true,
        isRequired: false
    },
    {
        name: "Corte + Barba",
        description: "Servicio combinado de corte y barba",
        price: 220,
        duration: 45,
        category: "haircut",
        isActive: true,
        isRequired: false
    }
];

const normalizeServiceForStorage = (service) => {
    const id = service.id || service._id || randomUUID();
    return {
        id,
        _id: id,
        name: service.name,
        description: service.description || "",
        price: service.price,
        duration: service.duration,
        category: service.category || "other",
        isActive: service.isActive !== undefined ? service.isActive : true,
        isRequired: service.isRequired !== undefined ? service.isRequired : false
    };
};

const buildDefaultServices = () =>
    DEFAULT_SERVICES_TEMPLATE.map((service) => normalizeServiceForStorage(service));

const ensureOwnerOrAdmin = async (req, barbershopId) => {
    if (req.user?.role === 'admin') return true;
    if (req.user?.role !== 'owner') return false;
    const shop = await Barbershop.findByPk(barbershopId);
    if (!shop) return false;
    return shop.ownerId === req.user.id;
};

//Crear una barberoa
const createBarbershop = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { name, address, location, phone, services, openingHours, description, isActive } = req.body;

        const resolvedAddress = address || location;
        const resolvedLocation = location || address;

        if (!name || !resolvedAddress || !resolvedLocation) {
            return res.status(400).json({ message: "Nombre, dirección y ubicación son obligatorios" });
        }

        const hasProvidedServices = Array.isArray(services) && services.length > 0;
        const normalizedServices = hasProvidedServices
            ? services.map((service) => normalizeServiceForStorage(service))
            : buildDefaultServices();

        const barbershop = await Barbershop.create({
            name,
            address: resolvedAddress,
            location: resolvedLocation,
            phone,
            ownerId: ownerId,
            services: normalizedServices,
            openingHours: openingHours || { openHour: 9, closeHour: 18 },
            description: description || null,
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({ message: "Barbería creada exitosamente", barbershop });
    } catch (err) {
        handleError(res, 'Error al crear la barberia', 500, err);

    }
};

//Consultar barberias
const getAllBarbershops = async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (typeof isActive !== 'undefined') where.isActive = isActive === 'true';

        const barbershops = await Barbershop.findAll({
            where,
            include: [{
                model: User,
                as: "owner",
                attributes: ["id", "name", "email"]
            }, {
                model: User,
                as: "barbers",
                attributes: ["id", "name"]
            }]
        });
        res.json(barbershops);
    } catch (err) {
        handleError(res, 'Error al obtener la barberia', 500, err);

    }
};

// Actualizar barbería
const updateBarbershop = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, location, phone, description, openingHours, isActive } = req.body;

        if (!(await ensureOwnerOrAdmin(req, id))) {
            return res.status(403).json({ message: "No autorizado para modificar esta barbería" });
        }

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        if (name !== undefined) barbershop.name = name;
        if (address !== undefined) barbershop.address = address;
        if (location !== undefined) barbershop.location = location;
        if (phone !== undefined) barbershop.phone = phone;
        if (description !== undefined) barbershop.description = description;
        if (openingHours !== undefined) barbershop.openingHours = openingHours;
        if (isActive !== undefined) barbershop.isActive = isActive;

        // Fallbacks si falta address o location
        if (!barbershop.address && barbershop.location) {
            barbershop.address = barbershop.location;
        }
        if (!barbershop.location && barbershop.address) {
            barbershop.location = barbershop.address;
        }

        await barbershop.save();

        res.json({ message: "Barbería actualizada correctamente", barbershop });
    } catch (err) {
        handleError(res, 'Error al actualizar la barbería', 500, err);
    }
};

// Eliminar barbería
const deleteBarbershop = async (req, res) => {
    try {
        const { id } = req.params;

        if (!(await ensureOwnerOrAdmin(req, id))) {
            return res.status(403).json({ message: "No autorizado para modificar esta barbería" });
        }

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        await barbershop.destroy();
        res.json({ message: "Barbería eliminada correctamente" });
    } catch (err) {
        handleError(res, 'Error al eliminar la barbería', 500, err);
    }
};

//Agregar un servicio a la barberia
const addServiceToBarbershop = async (req, res) => {
    try {
        const { id } = req.params; // barbershop ID
        const { name, price, duration, description, category, isRequired } = req.body;

        if (!(await ensureOwnerOrAdmin(req, id))) {
            return res.status(403).json({ message: "No autorizado para modificar esta barbería" });
        }

        if (!name || !price || !duration) {
            return res.status(400).json({ message: "Faltan campos obligatorios del servicio" });
        }

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const services = barbershop.services || [];
        services.push({ 
            id: randomUUID(),
            name, 
            price, 
            duration,
            description: description || '',
            category: category || 'other',
            isActive: true,
            isRequired: isRequired || false
        });
        const lastService = services[services.length - 1];
        lastService._id = lastService.id;
        barbershop.services = services;
        await barbershop.save();

        res.json({ message: "Servicio agregado correctamente", barbershop });
    } catch (err) {
        handleError(res, 'Error al agregar servicio', 500, err);
    }
};

//Actualizar un servicio existente
const updateServiceInBarbershop = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        const { name, price, duration, description, category, isActive, isRequired } = req.body;

        if (!(await ensureOwnerOrAdmin(req, id))) {
            return res.status(403).json({ message: "No autorizado para modificar esta barbería" });
        }

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const services = barbershop.services || [];
        const serviceIndex = services.findIndex(s => s._id === serviceId || s.id === serviceId);
        if (serviceIndex === -1) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        const service = services[serviceIndex];
        if (name !== undefined) service.name = name;
        if (price !== undefined) service.price = price;
        if (duration !== undefined) service.duration = duration;
        if (description !== undefined) service.description = description;
        if (category !== undefined) service.category = category;
        if (isActive !== undefined) service.isActive = isActive;
        if (isRequired !== undefined) service.isRequired = isRequired;

        services[serviceIndex] = service;
        barbershop.services = services;
        await barbershop.save();

        res.json({ message: "Servicio actualizado correctamente", service });
    } catch (err) {
        handleError(res, 'Error al actualizar servicio', 500, err);
    }
};

//Eliminar un servicio 

const deleteServiceFromBarbershop = async (req, res) => {
    try {
        const { id, serviceId } = req.params;

        if (!(await ensureOwnerOrAdmin(req, id))) {
            return res.status(403).json({ message: "No autorizado para modificar esta barbería" });
        }

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const services = barbershop.services || [];
        const filteredServices = services.filter(s => 
            (s._id && s._id.toString() !== serviceId) && 
            (s.id && s.id.toString() !== serviceId)
        );
        
        if (filteredServices.length === services.length) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        barbershop.services = filteredServices;
        await barbershop.save();

        res.json({ message: "Servicio eliminado correctamente" });
    } catch (err) {
        handleError(res, 'Error al eliminar servicio', 500, err);
    }
};

//Obtener todos los servicios de una barberia
const getBarbershopServices = async (req, res) => {
    try {
        const { id } = req.params;

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        res.json({ services: barbershop.services || [] });
    } catch (err) {
        handleError(res, 'Error al obtener servicios', 500, err);
    }
};

//Actualizar horario de la barberia
const updateBookingHours = async (req, res) => {
    try {
        const { id } = req.params;
        const { openHour, closeHour } = req.body;

        if (!(await ensureOwnerOrAdmin(req, id))) {
            return res.status(403).json({ message: "No autorizado para modificar esta barbería" });
        }

        if (typeof openHour !== 'number' || typeof closeHour !== 'number') {
            return res.status(400).json({ message: "los horarios deben ser numeros enteros, en horario militar" })
        }

        if (openHour >= closeHour) {
            return res.status(400).json({ message: "La hora de apertura debe ser menor a la de cierre" })
        }

        const barbershop = await Barbershop.findByPk(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barberia no encontrada" })
        }

        barbershop.openingHours = {
            openHour,
            closeHour
        };
        await barbershop.save();

        res.json({ message: "Horario actualizado correctamente", barbershop });

    } catch (err) {
        handleError(res, 'Error al actualizar horario de la barberia', 500, err);
    }
}

module.exports = {
    createBarbershop,
    getAllBarbershops,
    updateBarbershop,
    deleteBarbershop,
    updateBookingHours,
    addServiceToBarbershop,
    updateServiceInBarbershop,
    deleteServiceFromBarbershop,
    getBarbershopServices
};
