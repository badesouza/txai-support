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
router.post('/', auth_middleware_1.authMiddleware, user_controller_1.UserController.createUser);
router.get('/:id', auth_middleware_1.authMiddleware, user_controller_1.UserController.getUserById);
router.put('/:id', auth_middleware_1.authMiddleware, user_controller_1.UserController.updateUserById);
router.delete('/:id', auth_middleware_1.authMiddleware, user_controller_1.UserController.deleteUser);
router.get('/', auth_middleware_1.authMiddleware, user_controller_1.UserController.listAllUsers);
exports.default = router;
