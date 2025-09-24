const Barbershop = require("../models/Barbershop");
const { handleError } = require("../utils/errorHandler");

//Crear una barberoa
const createBarbershop = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { name, address, services, openingHours } = req.body;

        if (!name || !address) {
            return res.status(400).json({ message: "Nombre y dirección son obligatorios" });
        }

        const barbershop = await Barbershop.create({
            name,
            address,
            owner: ownerId,
            services: services || [],
            openingHours: openingHours || { openHour: 9, closeHour: 18 }
        });

        await barbershop.save();
        res.status(201).json({ message: "Barbería creada exitosamente", barbershop });
    } catch (err) {
        handleError(res, 'Error al crear la barberia', 500, err);

    }
};

//Consultar barberias
const getAllBarbershops = async (req, res) => {
    try {
        const barbershops = await Barbershop.find().populate("owner", "name email");
        res.json(barbershops);
    } catch (err) {
        handleError(res, 'Error al obtener la barberia', 500, err);

    }
};

//Agregar un servicio a la barberia
const addServiceToBarbershop = async (req, res) => {
    try {
        const { id } = req.params; // barbershop ID
        const { name, price, duration } = req.body;

        if (!name || !price || !duration) {
            return res.status(400).json({ message: "Faltan campos obligatorios del servicio" });
        }

        const barbershop = await Barbershop.findById(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        barbershop.services.push({ name, price, duration });
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
        const { name, price, duration } = req.body;

        const barbershop = await Barbershop.findById(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const service = barbershop.services.id(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        if (name !== undefined) service.name = name;
        if (price !== undefined) service.price = price;
        if (duration !== undefined) service.duration = duration;

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

        const barbershop = await Barbershop.findById(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        const service = barbershop.services.id(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        barbershop.services.pull(serviceId);
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

        const barbershop = await Barbershop.findById(id);
        if (!barbershop) {
            return res.status(404).json({ message: "Barbería no encontrada" });
        }

        res.json({ services: barbershop.services });
    } catch (err) {
        handleError(res, 'Error al obtener servicios', 500, err);
    }
};

//Actualizar horario de la barberia
const updateBookingHours = async (req, res) => {
    try {
        const { id } = req.params;
        const { openHour, closeHour } = req.body;

        if (typeof openHour !== 'number' || typeof closeHour !== 'number') {
            return res.status(400).json({ message: "los horarios deben ser numeros enteros, en horario militar" })
        }

        if (openHour >= closeHour) {
            return res.status(400).json({ message: "La hora de apertura debe ser menor a la de cierre" })
        }

        const barbershop = await Barbershop.findByIdAndUpdate(
            id,
            {
                'openingHours.openHour': openHour,
                'openingHours.closeHour': closeHour,
            },
            { new: true }
        );

        await Barbershop.updateOne(
            { _id: id },
            { $unset: { openHour: "", closeHour: "" } }
        );

        if (!barbershop) {
            return res.status(404).json({ message: "Barberia no encontrada" })
        }

        res.json({ message: "Horario actualizado correctamente", barbershop });

    } catch (err) {
        handleError(res, 'Error al actualizar horario de la barberia', 500, err);
    }
}

module.exports = {
    createBarbershop,
    getAllBarbershops,
    updateBookingHours,
    addServiceToBarbershop,
    updateServiceInBarbershop,
    deleteServiceFromBarbershop,
    getBarbershopServices
};