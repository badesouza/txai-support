"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const call_controller_1 = require("../controllers/call.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// Call routes
router.post('/', upload.array('images', 5), call_controller_1.CallController.create);
router.get('/user', call_controller_1.CallController.getByUser);
router.get('/:id', call_controller_1.CallController.getById);
router.put('/:id', upload.array('images', 5), call_controller_1.CallController.update);
router.delete('/:id', call_controller_1.CallController.delete);
// Image routes
router.delete('/:callId/images/:imageId', call_controller_1.CallController.deleteImage);
exports.default = router;
