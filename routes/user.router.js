const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const userController = require("../controller/users.controller");
const { required } = require("@hapi/joi/lib/base");
const { auth, adminAuth } = require("../middleware/auth");
// const check = require("../middleware/validation/validationcontroller/user.validation");

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: {
    error:
      "Too many login attempts from this IP, please try again after 15 minutes.",
  },
});

router.post("/signup", userController.signUp);
router.post(
  "/login",
  //   check.loginValidation,
  loginLimiter,
  userController.login
);
router.get("/users/:id", auth, userController.getOneUser);
router.get("/:role", adminAuth, userController.getAllUsers);
router.put("/users/:id", userController.updateUser);

module.exports = router;
