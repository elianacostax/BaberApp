const express = require("express");
const router = express.Router();
const {register, login, forgotPassword, resetPassword, registerBarbershop} = require("../controllers/authController");
const { validateSchema, schemas } = require("../middlewares/validateBody");

router.post("/register", validateSchema(schemas.userRegister), register);
router.post("/register-barbershop", validateSchema(schemas.barbershopRegister), registerBarbershop);
router.post("/login", validateSchema(schemas.userLogin), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
