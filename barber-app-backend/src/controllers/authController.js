const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { handleError } = require("../utils/errorHandler");
const crypto = require('crypto');
const { sendResetPasswordEmail } = require('../utils/mailer');

const register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExist = await User.findOne({ email });
        if (userExist) return res.status(400).json({ message: "El correo ya está en uso" });

        // Registro público: siempre crear como cliente
        const user = await User.create({
            name,
            email,
            password,
            role: "client",
        });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        handleError(res, 'Error al registrar', 500, err);
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Contraseña incorrecta" });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
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
        const user = await User.findOne({ email });
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
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
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