const express = require("express");
const router = express.Router();
const {register, login} = require("../controllers/authController");
const { validateSchema, schemas } = require("../middlewares/validateBody");

router.post("/register", validateSchema(schemas.userRegister), register);
router.post("/login", validateSchema(schemas.userLogin), login);

module.exports = router;