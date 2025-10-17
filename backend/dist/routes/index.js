"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_routes_1 = __importDefault(require("./user.routes"));
const call_routes_1 = __importDefault(require("./call.routes"));
const whatsapp_routes_1 = __importDefault(require("./whatsapp.routes"));
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});
router.use('/users', user_routes_1.default);
router.use('/calls', call_routes_1.default);
router.use('/whatsapp', whatsapp_routes_1.default);
exports.default = router;
