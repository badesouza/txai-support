"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', user_controller_1.UserController.register);
router.post('/login', user_controller_1.UserController.login);
// Protected routes
router.get('/profile', auth_middleware_1.authMiddleware, user_controller_1.UserController.getProfile);
router.put('/profile', auth_middleware_1.authMiddleware, user_controller_1.UserController.updateProfile);
router.put('/password', auth_middleware_1.authMiddleware, user_controller_1.UserController.updatePassword);
exports.default = router;
