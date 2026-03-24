const AvailabilityBlock = require("../models/AvailabilityBlock");
const Barbershop = require("../models/Barbershop");
const User = require("../models/User");
const { handleError } = require("../utils/errorHandler");
const { Op } = require("sequelize");

const getOwnerBarbershopIds = async (ownerId) => {
  const shops = await Barbershop.findAll({
    where: { ownerId },
    attributes: ["id"],
  });
  return shops.map((shop) => shop.id);
};

const resolveRequesterContext = async (req) => {
  if (req.user.role === "owner") {
    const ownerShopIds = await getOwnerBarbershopIds(req.user.id);
    return { ownerShopIds };
  }

  if (req.user.role === "barber") {
    const barber = await User.findByPk(req.user.id, {
      attributes: ["id", "barbershopId"],
    });
    return { barber };
  }

  return {};
};

const resolveTargetBarber = async (barberId) => {
  if (!barberId) return null;

  return User.findByPk(barberId, {
    attributes: ["id", "role", "barbershopId"],
  });
};

const ensureBarbershopAccess = async ({ req, targetBarber, ownerShopIds }) => {
  if (req.user.role === "admin") return { allowed: true };

  if (req.user.role === "owner") {
    if (!ownerShopIds.length) {
      return { allowed: false, status: 403, message: "Owner sin barbería asociada" };
    }

    if (targetBarber?.barbershopId && !ownerShopIds.includes(targetBarber.barbershopId)) {
      return { allowed: false, status: 403, message: "No autorizado para operar sobre otra barbería" };
    }

    return { allowed: true, defaultBarbershopId: targetBarber?.barbershopId || ownerShopIds[0] };
  }

  if (req.user.role === "barber") {
    if (!targetBarber || targetBarber.id !== req.user.id) {
      return { allowed: false, status: 403, message: "Solo puedes gestionar tu propia agenda" };
    }

    if (!targetBarber.barbershopId) {
      return { allowed: false, status: 400, message: "El barbero no tiene barbería asociada" };
    }

    return { allowed: true, defaultBarbershopId: targetBarber.barbershopId };
  }

  return { allowed: false, status: 403, message: "No autorizado" };
};

const createAvailabilityBlock = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      start,
      end,
      reason,
      appliesToAllBarbers = false,
      barber: barberIdInput,
    } = req.body;

    if (!start || !end) {
      return res.status(400).json({ message: "Las fechas de inicio y fin son requeridas." });
    }

    if (new Date(end) <= new Date(start)) {
      return res.status(400).json({ message: "La fecha de fin debe ser posterior a la de inicio" });
    }

    if (req.user.role === "barber" && appliesToAllBarbers) {
      return res.status(403).json({ message: "Un barbero no puede crear bloqueos generales de barbería" });
    }

    const { ownerShopIds, barber: requesterBarber } = await resolveRequesterContext(req);
    const resolvedBarberId = req.user.role === "barber" ? req.user.id : barberIdInput || null;
    const targetBarber = resolvedBarberId
      ? await resolveTargetBarber(resolvedBarberId)
      : requesterBarber || null;

    if (resolvedBarberId && (!targetBarber || targetBarber.role !== "barber")) {
      return res.status(404).json({ message: "Barbero no encontrado" });
    }

    const access = await ensureBarbershopAccess({ req, targetBarber, ownerShopIds: ownerShopIds || [] });
    if (!access.allowed) {
      return res.status(access.status).json({ message: access.message });
    }

    const blockBarbershopId = appliesToAllBarbers
      ? access.defaultBarbershopId
      : targetBarber?.barbershopId || access.defaultBarbershopId || null;

    if (!blockBarbershopId) {
      return res.status(400).json({ message: "No fue posible determinar la barbería del bloqueo" });
    }

    const block = await AvailabilityBlock.create({
      start,
      end,
      reason,
      createdById: userId,
      appliesToAllBarbers,
      barberId: appliesToAllBarbers ? null : resolvedBarberId,
      barbershopId: blockBarbershopId,
    });

    res.status(201).json({ message: "Bloqueo creado correctamente", block });
  } catch (err) {
    handleError(res, "Error al crear bloqueo", 500, err);
  }
};

const getAvailabilityBlocks = async (req, res) => {
  try {
    const { barberId } = req.query;
    const where = {};

    if (req.user.role === "owner") {
      const ownerShopIds = await getOwnerBarbershopIds(req.user.id);
      if (!ownerShopIds.length) return res.status(200).json([]);
      where.barbershopId = { [Op.in]: ownerShopIds };
    } else if (req.user.role === "barber") {
      const barber = await User.findByPk(req.user.id, { attributes: ["id", "barbershopId"] });
      if (!barber?.barbershopId) return res.status(200).json([]);
      where.barbershopId = barber.barbershopId;
      where[Op.or] = [{ barberId: req.user.id }, { appliesToAllBarbers: true }];
    }

    if (barberId) {
      const targetBarber = await resolveTargetBarber(barberId);
      if (!targetBarber || targetBarber.role !== "barber") {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      if (req.user.role === "owner") {
        const ownerShopIds = await getOwnerBarbershopIds(req.user.id);
        if (!ownerShopIds.includes(targetBarber.barbershopId)) {
          return res.status(403).json({ message: "No autorizado para consultar otra barbería" });
        }
      }

      if (req.user.role === "barber" && barberId !== req.user.id) {
        return res.status(403).json({ message: "Solo puedes consultar tu propia agenda" });
      }

      where.barbershopId = targetBarber.barbershopId;
      where[Op.or] = [{ appliesToAllBarbers: true }, { barberId }];
    }

    const blocks = await AvailabilityBlock.findAll({
      where,
      order: [["start", "ASC"]],
    });

    res.status(200).json(blocks);
  } catch (err) {
    handleError(res, "Error al obtener bloqueos", 500, err);
  }
};

const updateAvailabilityBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const block = await AvailabilityBlock.findByPk(id);
    if (!block) {
      return res.status(404).json({ message: "Bloqueo no encontrado" });
    }

    const isAdmin = req.user.role === "admin";
    const isCreator = block.createdById === req.user.id;

    if (req.user.role === "owner") {
      const ownerShopIds = await getOwnerBarbershopIds(req.user.id);
      if (!ownerShopIds.includes(block.barbershopId)) {
        return res.status(403).json({ message: "No autorizado para modificar este bloqueo" });
      }
    } else if (req.user.role === "barber") {
      if (!isCreator || block.barberId !== req.user.id || block.appliesToAllBarbers) {
        return res.status(403).json({ message: "No autorizado para modificar este bloqueo" });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ message: "No autorizado para modificar este bloqueo" });
    }

    if (update.appliesToAllBarbers !== undefined && req.user.role === "barber") {
      return res.status(403).json({ message: "Un barbero no puede convertir un bloqueo en general" });
    }

    if (update.barberId !== undefined) {
      if (req.user.role === "barber" && update.barberId !== req.user.id) {
        return res.status(403).json({ message: "Solo puedes reasignar bloqueos a tu propia agenda" });
      }

      if (update.barberId !== null) {
        const targetBarber = await resolveTargetBarber(update.barberId);
        if (!targetBarber || targetBarber.role !== "barber") {
          return res.status(404).json({ message: "Barbero no encontrado" });
        }
        if (targetBarber.barbershopId !== block.barbershopId) {
          return res.status(400).json({ message: "El bloqueo debe permanecer dentro de la misma barbería" });
        }
      }
    }

    if (update.start !== undefined) block.start = update.start;
    if (update.end !== undefined) block.end = update.end;
    if (update.reason !== undefined) block.reason = update.reason;
    if (update.appliesToAllBarbers !== undefined) block.appliesToAllBarbers = update.appliesToAllBarbers;
    if (update.barberId !== undefined) block.barberId = update.appliesToAllBarbers ? null : update.barberId;

    if (new Date(block.end) <= new Date(block.start)) {
      return res.status(400).json({ message: "La fecha de fin debe ser posterior a la de inicio" });
    }

    await block.save();

    res.status(200).json({ message: "Bloqueo actualizado", block });
  } catch (err) {
    handleError(res, "Error al actualizar bloqueo", 500, err);
  }
};

const deleteAvailabilityBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const block = await AvailabilityBlock.findByPk(id);

    if (!block) {
      return res.status(404).json({ message: "Bloqueo no encontrado" });
    }

    const isAdmin = req.user.role === "admin";

    if (req.user.role === "owner") {
      const ownerShopIds = await getOwnerBarbershopIds(req.user.id);
      if (!ownerShopIds.includes(block.barbershopId)) {
        return res.status(403).json({ message: "No autorizado para eliminar este bloqueo" });
      }
    } else if (req.user.role === "barber") {
      if (block.createdById !== req.user.id || block.barberId !== req.user.id || block.appliesToAllBarbers) {
        return res.status(403).json({ message: "No autorizado para eliminar este bloqueo" });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ message: "No autorizado para eliminar este bloqueo" });
    }

    await block.destroy();

    res.status(200).json({ message: "Bloqueo eliminado correctamente" });
  } catch (err) {
    handleError(res, "Error al eliminar bloqueo", 500, err);
  }
};

module.exports = {
  createAvailabilityBlock,
  getAvailabilityBlocks,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
};
