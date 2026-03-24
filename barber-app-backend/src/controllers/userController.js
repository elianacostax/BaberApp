const User = require('../models/User');
const Barbershop = require('../models/Barbershop');
const { handleError } = require('../utils/errorHandler');

const PRIVATE_USER_FIELDS = ["password", "resetPasswordToken", "resetPasswordExpires"];

//Actualizar horario de barbero
const updateUserSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { schedule } = req.body;

    if (!schedule) {
      return res.status(400).json({ message: 'El horario es requerido' });
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'barber') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Validar contra horario de barbería si existe
    if (user.barbershopId) {
      const shop = await Barbershop.findByPk(user.barbershopId);
      if (shop && shop.openingHours) {
        const { openHour, closeHour } = shop.openingHours;
        for (const [day, hours] of Object.entries(schedule)) {
          if (!hours || !hours.start || !hours.end) continue;
          const [sh, sm] = hours.start.split(':').map(Number);
          const [eh, em] = hours.end.split(':').map(Number);
          if (sh < openHour || eh > closeHour || (eh === closeHour && em > 0)) {
            return res.status(400).json({
              message: `El día ${day} debe estar entre ${String(openHour).padStart(2,'0')}:00 y ${String(closeHour).padStart(2,'0')}:00`
            });
          }
        }
      }
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

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'barber') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    //Validaciones
    if (photo !== undefined) user.photo = photo;
    if (bio !== undefined) user.bio = bio;
    if (barbershop !== undefined && barbershop !== user.barbershopId) {
      return res.status(403).json({ message: 'La barbería del barbero solo puede cambiarla un administrador de la barbería' });
    }

    //Validar servicios si se envian
    if (services !== undefined) {
      if (!Array.isArray(services)) {
        return res.status(400).json({ message: 'Los servicios deben ser un array' })
      }
    }

    for (const service of services || []) {
      if (!service.name || typeof service.duration !== 'number' || typeof service.price !== 'number') {
        return res.status(400).json({ message: 'Cada servicio debe tener nombre, duración (min) y precio' });
      }
    }

    if (services !== undefined) {
      user.customServices = services;
    }

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

    const user = await User.findByPk(id, {
      attributes: { exclude: PRIVATE_USER_FIELDS },
      include: [{
        model: Barbershop,
        as: "barbershop",
        attributes: ["id", "name", "address", "phone", "openingHours"]
      }]
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ user });
  } catch (err) {
    handleError(res, 'Error al consultar perfil', 500, err);
}
};

module.exports = {
  updateUserSchedule,
  updateBarberProfile,
  getUserProfile
};

// Listar usuarios con filtros opcionales (rol, barbería, estado)
module.exports.listUsers = async (req, res) => {
  try {
    const { role, barbershop, isActive } = req.query;
    const where = {};
    if (role) where.role = role;
    if (barbershop) where.barbershopId = barbershop;
    if (typeof isActive !== 'undefined') where.isActive = isActive === 'true';

    const isAuthenticated = Boolean(req.user?.id);

    // Si la consulta es pública, restringimos datos al listado de barberos activos.
    if (!isAuthenticated) {
      where.role = 'barber';
      where.isActive = true;
    }

    const users = await User.findAll({
      where,
      attributes: isAuthenticated
        ? { exclude: PRIVATE_USER_FIELDS }
        : ["id", "name", "role", "photo", "bio", "barbershopId", "schedule"],
      include: [{
        model: Barbershop,
        as: "barbershop",
        attributes: ["id", "name", "location", "address"]
      }]
    });
    res.json(users);
  } catch (err) {
    handleError(res, 'Error al listar usuarios', 500, err);
  }
};

// Obtener favoritos del usuario autenticado
module.exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const prefs = user.preferences || { favoriteBarbers: [], favoriteBarbershops: [] };
    res.json({
      favoriteBarbers: Array.isArray(prefs.favoriteBarbers) ? prefs.favoriteBarbers : [],
      favoriteBarbershops: Array.isArray(prefs.favoriteBarbershops) ? prefs.favoriteBarbershops : []
    });
  } catch (err) {
    handleError(res, 'Error al obtener favoritos', 500, err);
  }
};

// Actualizar favoritos (toggle o set)
module.exports.updateMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, id, favorite } = req.body;

    if (!['barber', 'barbershop'].includes(type) || !id) {
      return res.status(400).json({ message: "Tipo o id inválidos" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const prefs = user.preferences || { favoriteBarbers: [], favoriteBarbershops: [] };
    const key = type === 'barber' ? 'favoriteBarbers' : 'favoriteBarbershops';
    const current = new Set(Array.isArray(prefs[key]) ? prefs[key] : []);

    const shouldFavorite = typeof favorite === 'boolean' ? favorite : !current.has(id);
    if (shouldFavorite) {
      current.add(id);
    } else {
      current.delete(id);
    }

    const nextPrefs = {
      ...prefs,
      [key]: Array.from(current)
    };

    user.preferences = nextPrefs;
    await user.save();

    res.json({
      message: "Favoritos actualizados",
      favoriteBarbers: nextPrefs.favoriteBarbers || [],
      favoriteBarbershops: nextPrefs.favoriteBarbershops || []
    });
  } catch (err) {
    handleError(res, 'Error al actualizar favoritos', 500, err);
  }
};
