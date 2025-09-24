const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token no proporcionado" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        req.user = {
            id: decoded.id,
            //role: decoded.role,
            role: user.role,
        }; // queda disponible para controladores

        next();
    } catch (err) {
        return res.status(401).json({ message: "Token invalido" });
    }
};

module.exports = { protect };