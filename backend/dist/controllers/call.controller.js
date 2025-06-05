"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallController = void 0;
const call_model_1 = require("../models/call.model");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class CallController {
    static async create(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const callData = {
                ...req.body,
                user_id: userId
            };
            const call = await call_model_1.CallModel.create(callData);
            // Handle image uploads if any
            if (req.files && Array.isArray(req.files)) {
                const uploadDir = path_1.default.join(__dirname, '../../uploads', call.id.toString());
                if (!fs_1.default.existsSync(uploadDir)) {
                    fs_1.default.mkdirSync(uploadDir, { recursive: true });
                }
                for (const file of req.files) {
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const filePath = path_1.default.join(uploadDir, fileName);
                    fs_1.default.writeFileSync(filePath, file.buffer);
                    await call_model_1.CallModel.addImage(call.id, `/uploads/${call.id}/${fileName}`);
                }
            }
            const images = await call_model_1.CallModel.getImages(call.id);
            res.status(201).json({ ...call, images });
        }
        catch (error) {
            res.status(500).json({ message: 'Error creating call' });
        }
    }
    static async getById(req, res) {
        try {
            const callId = parseInt(req.params.id);
            const call = await call_model_1.CallModel.findById(callId);
            if (!call) {
                return res.status(404).json({ message: 'Call not found' });
            }
            // Check if user has permission to view this call
            if (req.user?.profile !== 'admin' && call.user_id !== req.user?.id) {
                return res.status(403).json({ message: 'Access denied' });
            }
            const images = await call_model_1.CallModel.getImages(callId);
            res.json({ ...call, images });
        }
        catch (error) {
            res.status(500).json({ message: 'Error fetching call' });
        }
    }
    static async getByUser(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const calls = await call_model_1.CallModel.findByUserId(userId);
            const callsWithImages = await Promise.all(calls.map(async (call) => {
                const images = await call_model_1.CallModel.getImages(call.id);
                return { ...call, images };
            }));
            res.json(callsWithImages);
        }
        catch (error) {
            res.status(500).json({ message: 'Error fetching calls' });
        }
    }
    static async update(req, res) {
        try {
            const callId = parseInt(req.params.id);
            const call = await call_model_1.CallModel.findById(callId);
            if (!call) {
                return res.status(404).json({ message: 'Call not found' });
            }
            // Check if user has permission to update this call
            if (req.user?.profile !== 'admin' && call.user_id !== req.user?.id) {
                return res.status(403).json({ message: 'Access denied' });
            }
            const callData = req.body;
            const updatedCall = await call_model_1.CallModel.update(callId, callData);
            if (!updatedCall) {
                return res.status(500).json({ message: 'Error updating call' });
            }
            // Handle new image uploads if any
            if (req.files && Array.isArray(req.files)) {
                const uploadDir = path_1.default.join(__dirname, '../../uploads', callId.toString());
                if (!fs_1.default.existsSync(uploadDir)) {
                    fs_1.default.mkdirSync(uploadDir, { recursive: true });
                }
                for (const file of req.files) {
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const filePath = path_1.default.join(uploadDir, fileName);
                    fs_1.default.writeFileSync(filePath, file.buffer);
                    await call_model_1.CallModel.addImage(callId, `/uploads/${callId}/${fileName}`);
                }
            }
            const images = await call_model_1.CallModel.getImages(callId);
            res.json({ ...updatedCall, images });
        }
        catch (error) {
            res.status(500).json({ message: 'Error updating call' });
        }
    }
    static async delete(req, res) {
        try {
            const callId = parseInt(req.params.id);
            const call = await call_model_1.CallModel.findById(callId);
            if (!call) {
                return res.status(404).json({ message: 'Call not found' });
            }
            // Check if user has permission to delete this call
            if (req.user?.profile !== 'admin' && call.user_id !== req.user?.id) {
                return res.status(403).json({ message: 'Access denied' });
            }
            // Delete associated images from filesystem
            const uploadDir = path_1.default.join(__dirname, '../../uploads', callId.toString());
            if (fs_1.default.existsSync(uploadDir)) {
                fs_1.default.rmSync(uploadDir, { recursive: true, force: true });
            }
            const success = await call_model_1.CallModel.delete(callId);
            if (!success) {
                return res.status(500).json({ message: 'Error deleting call' });
            }
            res.json({ message: 'Call deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ message: 'Error deleting call' });
        }
    }
    static async deleteImage(req, res) {
        try {
            const imageId = parseInt(req.params.imageId);
            const callId = parseInt(req.params.callId);
            const call = await call_model_1.CallModel.findById(callId);
            if (!call) {
                return res.status(404).json({ message: 'Call not found' });
            }
            // Check if user has permission to delete this image
            if (req.user?.profile !== 'admin' && call.user_id !== req.user?.id) {
                return res.status(403).json({ message: 'Access denied' });
            }
            const success = await call_model_1.CallModel.deleteImage(imageId);
            if (!success) {
                return res.status(500).json({ message: 'Error deleting image' });
            }
            res.json({ message: 'Image deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ message: 'Error deleting image' });
        }
    }
}
exports.CallController = CallController;
