const User = require('../models/User');

//Actualizar horario de barbero
const updateUserSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { schedule } = req.body;

    console.log("Usuario autenticado:", userId);

    if (!schedule) {
      return res.status(400).json({ message: 'El horario es requerido' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'barber') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    user.schedule = schedule;
    await user.save();

    res.status(200).json({ message: 'Horario actualizado correctamente', schedule: user.schedule });
  } catch (err) {
    handleError(res, 'Error al actualizar horario', 500, err);
}
};

//Actualizar perfil del barbero
const updateBarberProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { photo, bio, services, barbershop } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'barber') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    //Validaciones
    if (photo !== undefined) user.photo = photo;
    if (bio !== undefined) user.bio = bio;
    if (barbershop !== undefined) user.barbershop = barbershop;

    //Validar servicios si se envian
    if (services !== undefined) {
      if (!Array.isArray(services)) {
        return res.status(400).json({ message: 'Los servicios deben ser un array' })
      }
    }

    for (const service of services) {
      if (!service.name || typeof service.duration !== 'number' || typeof service.price !== 'number') {
        return res.status(400).json({ message: 'Cada servicio debe tener nombre, duración (min) y precio' });
      }
    }

    user.services = services;

    await user.save();
    res.status(200).json({ message: 'Perfil actualizado correctamente', user });
  } catch (err) {
    handleError(res, 'Error al actualizar perfil', 500, err);
}
}

//Consultar perfil usuario
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -__v") // oculta password y versión
      .populate("barbershop", "name address phone"); // muestra info de la barbería

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ user });
  } catch (err) {
    handleError(res, 'Error al consultar perfil', 500, err);
}
};

//Bloqueo manual de fechas o horarios
const addBlockedTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end, reason } = req.body;

    if (!start || !end) {
      return res.status(400).json({ message: "Inicio y fin del bloqueo son obligatorios" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'barber') {
      return res.status(403).json({ message: "No autorizado" });
    }

    user.blockedTimes.push({ start: new Date(start), end: new Date(end), reason });
    await user.save();

    res.status(200).json({ message: "Bloqueo registrado exitosamente", blockedTimes: user.blockedTimes });
  } catch (err) {
    handleError(res, 'Error al agregar bloqueo', 500, err);
}
};

module.exports = {
  updateUserSchedule,
  updateBarberProfile,
  getUserProfile,
  addBlockedTime
};