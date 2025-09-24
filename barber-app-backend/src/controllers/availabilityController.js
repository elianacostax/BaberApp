const AvailabilityBlock = require("../models/AvailabilityBlock");

// Crear un nuevo bloqueo
const createAvailabilityBlock = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start, end, reason, type = "manual", appliesToAllBarbers = false, barber } = req.body;

        if (!start || !end) {
            return res.status(400).json({ message: "Las fechas de inicio y fin son requeridas." });
        }

        if (new Date(end) <= new Date(start)) {
            return res.status(400).json({ message: "La fecha de fin debe ser posterior a la de inicio" });
        }

        const block = new AvailabilityBlock({
            start,
            end,
            reason,
            type,
            createdBy: userId,
            appliesToAllBarbers,
            barber: appliesToAllBarbers ? null : (barber || userId)
        });

        await block.save();
        res.status(201).json({ message: "Bloqueo creado correctamente", block });
    } catch (err) {
        handleError(res, 'Error al crear bloqueo', 500, err);
    }
};

// Obtener bloqueos
const getAvailabilityBlocks = async (req, res) => {
    try {
        const { barberId } = req.query;
        const query = {};

        if (barberId) {
            query.$or = [
                { appliesToAllBarbers: true },
                { barber: barberId }
            ];
        }

        const blocks = await AvailabilityBlock.find(query).sort({ start: 1 });
        res.status(200).json(blocks);
    } catch (err) {
        handleError(res, 'Error al obtener bloqueos', 500, err);
    }
};

// Actualizar un bloqueo
const updateAvailabilityBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;

        const updatedBlock = await AvailabilityBlock.findByIdAndUpdate(id, update, { new: true });

        if (!updatedBlock) {
            return res.status(404).json({ message: "Bloqueo no encontrado" });
        }

        //Evita que un barbero elimine bloqueos de otro.
        const block = await AvailabilityBlock.findById(id);
        if (!block) {
            return res.status(404).json({ message: "Bloqueo no encontrado" });
        }

        const isOwner = block.createdBy.toString() === req.user.id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "No autorizado para modificar este bloqueo" });
        }

        res.status(200).json({ message: "Bloqueo actualizado", block: updatedBlock });
    } catch (err) {
        handleError(res, 'Error al actualizar bloqueo', 500, err);
    }
};

// Eliminar un bloqueo
const deleteAvailabilityBlock = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar permisos ANTES de eliminar
        const block = await AvailabilityBlock.findById(id);
        if (!block) {
            return res.status(404).json({ message: "Bloqueo no encontrado" });
        }

        const isOwner = block.createdBy.toString() === req.user.id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "No autorizado para eliminar este bloqueo" });
        }

        await AvailabilityBlock.findByIdAndDelete(id);

        res.status(200).json({ message: "Bloqueo eliminado correctamente" });
    } catch (err) {
        handleError(res, 'Error al eliminar bloqueo', 500, err);
    }
};
module.exports = {
    createAvailabilityBlock,
    getAvailabilityBlocks,
    updateAvailabilityBlock,
    deleteAvailabilityBlock
};