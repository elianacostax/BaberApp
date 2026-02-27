const User = require("../models/User");
const Barbershop = require("../models/Barbershop");
const jwt = require("jsonwebtoken");
const { handleError } = require("../utils/errorHandler");
const crypto = require('crypto');
const { Op } = require("sequelize");
const { sendResetPasswordEmail } = require('../utils/mailer');

const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // Verificar que el modelo User esté cargado
        if (!User) {
            throw new Error('Modelo User no está disponible');
        }

        const userExist = await User.findOne({ where: { email } });
        if (userExist) return res.status(400).json({ message: "El correo ya está en uso" });

        // Preparar datos para crear usuario (solo incluir phone si existe)
        const userData = {
            name,
            email,
            password,
            role: "client",
        };
        
        // Solo agregar phone si se proporciona y no está vacío
        if (phone && phone.trim() !== '') {
            userData.phone = phone.trim();
        }

        // Registro público: siempre crear como cliente
        const user = await User.create(userData);

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, barbershopId: user.barbershopId || null },
        });
    } catch (err) {
        // Mejorar el manejo de errores para mostrar mensajes más claros
        console.error('Error al registrar usuario:', err);
        console.error('Stack:', err.stack);
        
        // Si es un error de validación de Sequelize, mostrar mensaje más claro
        if (err.name === 'SequelizeValidationError') {
            const messages = err.errors.map(e => e.message).join(', ');
            return res.status(400).json({ 
                message: 'Error de validación', 
                errors: messages,
                details: process.env.NODE_ENV === 'development' ? err.errors : undefined
            });
        }
        
        // Si es un error de duplicado (email único)
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: 'El correo ya está en uso' 
            });
        }
        
        // Si es un error de base de datos
        if (err.name === 'SequelizeDatabaseError') {
            return res.status(500).json({ 
                message: 'Error de base de datos',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        
        handleError(res, 'Error al registrar', 500, err);
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ message: "Contraseña incorrecta" });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, barbershopId: user.barbershopId || null },
        });
    } catch (err) {
        handleError(res, 'Error al iniciar sesión', 500, err);
    }
};

module.exports = { register, login };

// Nuevos controladores: recuperación de contraseña
module.exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(200).json({ message: 'Si el correo existe, enviaremos instrucciones.' });

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutos
        await user.save();

        // Enviar email con el enlace
        try {
            await sendResetPasswordEmail(user.email, token);
        } catch (e) {
            // Si falla el correo, igualmente devolvemos 200 para no filtrar emails
        }
        // En desarrollo podemos opcionalmente devolver el token para testing
        const payload = { message: 'Instrucciones enviadas' };
        if (process.env.NODE_ENV !== 'production') payload.token = token;
        return res.json(payload);
    } catch (err) {
        handleError(res, 'Error al solicitar recuperación', 500, err);
    }
}

module.exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: new Date() }
            }
        });
        if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.json({ message: 'Contraseña actualizada' });
    } catch (err) {
        handleError(res, 'Error al resetear contraseña', 500, err);
    }
}

// Registro de barbería + owner
module.exports.registerBarbershop = async (req, res) => {
    const { ownerName, ownerEmail, ownerPassword, ownerPhone, barbershopName, address, location, phone, description, openingHours } = req.body;

    try {
        const existing = await User.findOne({ where: { email: ownerEmail } });
        if (existing) return res.status(400).json({ message: "El correo ya está en uso" });

        const owner = await User.create({
            name: ownerName,
            email: ownerEmail,
            password: ownerPassword,
            phone: ownerPhone || null,
            role: "owner"
        });

        const barbershop = await Barbershop.create({
            name: barbershopName,
            address: address || location,
            location: location || address,
            phone: phone || null,
            description: description || null,
            ownerId: owner.id,
            openingHours: openingHours || { openHour: 9, closeHour: 18 },
            isActive: true
        });

        owner.barbershopId = barbershop.id;
        await owner.save();

        const token = jwt.sign({ id: owner.id, role: owner.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({
            token,
            user: { id: owner.id, name: owner.name, email: owner.email, role: owner.role, barbershopId: barbershop.id },
            barbershop: { id: barbershop.id, name: barbershop.name }
        });
    } catch (err) {
        handleError(res, 'Error al registrar barbería', 500, err);
    }
}
