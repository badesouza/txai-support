"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
class UserController {
    static async register(req, res) {
        try {
            const userData = req.body;
            const existingUser = await User_1.UserModel.findByEmail(userData.email);
            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }
            const user = await User_1.UserModel.create(userData);
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, profile: user.profile }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
            res.status(201).json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    profile: user.profile
                },
                token
            });
        }
        catch (error) {
            res.status(500).json({ message: 'Error creating user' });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await User_1.UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const isValidPassword = await User_1.UserModel.verifyPassword(user, password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, profile: user.profile }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    profile: user.profile
                },
                token
            });
        }
        catch (error) {
            res.status(500).json({ message: 'Error during login' });
        }
    }
    static async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const user = await User_1.UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                profile: user.profile
            });
        }
        catch (error) {
            res.status(500).json({ message: 'Error fetching profile' });
        }
    }
    static async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const updatedUser = await User_1.UserModel.update(userId, req.body);
            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                profile: updatedUser.profile
            });
        }
        catch (error) {
            res.status(500).json({ message: 'Error updating profile' });
        }
    }
    static async updatePassword(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const { currentPassword, newPassword } = req.body;
            const user = await User_1.UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const isValidPassword = await User_1.UserModel.verifyPassword(user, currentPassword);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
            const success = await User_1.UserModel.updatePassword(userId, newPassword);
            if (!success) {
                return res.status(500).json({ message: 'Error updating password' });
            }
            res.json({ message: 'Password updated successfully' });
        }
        catch (error) {
            res.status(500).json({ message: 'Error updating password' });
        }
    }
}
exports.UserController = UserController;
