const AvailabilityBlock = require("../models/AvailabilityBlock");
const { handleError } = require("../utils/errorHandler");
const { Op } = require("sequelize");

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

        const block = await AvailabilityBlock.create({
            start,
            end,
            reason,
            createdById: userId,
            appliesToAllBarbers,
            barberId: appliesToAllBarbers ? null : (barber || userId)
        });

        res.status(201).json({ message: "Bloqueo creado correctamente", block });
    } catch (err) {
        handleError(res, 'Error al crear bloqueo', 500, err);
    }
};

// Obtener bloqueos
const getAvailabilityBlocks = async (req, res) => {
    try {
        const { barberId } = req.query;
        let where = {};

        if (barberId) {
            where = {
                [Op.or]: [
                    { appliesToAllBarbers: true },
                    { barberId: barberId }
                ]
            };
        }

        const blocks = await AvailabilityBlock.findAll({
            where,
            order: [["start", "ASC"]]
        });
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

        //Evita que un barbero elimine bloqueos de otro.
        const block = await AvailabilityBlock.findByPk(id);
        if (!block) {
            return res.status(404).json({ message: "Bloqueo no encontrado" });
        }

        const isOwner = block.createdById === req.user.id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "No autorizado para modificar este bloqueo" });
        }

        // Actualizar campos permitidos
        if (update.start !== undefined) block.start = update.start;
        if (update.end !== undefined) block.end = update.end;
        if (update.reason !== undefined) block.reason = update.reason;
        if (update.appliesToAllBarbers !== undefined) block.appliesToAllBarbers = update.appliesToAllBarbers;
        if (update.barberId !== undefined) block.barberId = update.barberId;

        await block.save();

        res.status(200).json({ message: "Bloqueo actualizado", block });
    } catch (err) {
        handleError(res, 'Error al actualizar bloqueo', 500, err);
    }
};

// Eliminar un bloqueo
const deleteAvailabilityBlock = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar permisos ANTES de eliminar
        const block = await AvailabilityBlock.findByPk(id);
        if (!block) {
            return res.status(404).json({ message: "Bloqueo no encontrado" });
        }

        const isOwner = block.createdById === req.user.id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "No autorizado para eliminar este bloqueo" });
        }

        await block.destroy();

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