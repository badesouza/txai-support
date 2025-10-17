"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('Auth header:', authHeader);
        if (!authHeader) {
            console.log('No token provided');
            return res.status(401).json({ error: 'No token provided' });
        }
        const parts = authHeader.split(' ');
        console.log('Token parts:', parts);
        if (parts.length !== 2) {
            console.log('Token error: invalid format');
            return res.status(401).json({ error: 'Token error' });
        }
        const [scheme, token] = parts;
        if (!/^Bearer$/i.test(scheme)) {
            console.log('Token error: malformatted');
            return res.status(401).json({ error: 'Token malformatted' });
        }
        console.log('Verifying token...');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
        console.log('Token decoded:', decoded);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id }
        });
        if (!user) {
            console.log('User not found:', decoded.id);
            return res.status(401).json({ error: 'User not found' });
        }
        console.log('User found:', user);
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            profile: user.profile
        };
        return next();
    }
    catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = (req, res, next) => {
    if (req.user?.profile !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
