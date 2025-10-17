"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallImageModel = void 0;
const prisma_1 = require("../lib/prisma");
exports.CallImageModel = {
    async create(imageData) {
        return prisma_1.prisma.callImage.create({
            data: imageData,
        });
    },
    async findById(id) {
        return prisma_1.prisma.callImage.findUnique({
            where: { id },
        });
    },
    async findByCallId(callId) {
        return prisma_1.prisma.callImage.findMany({
            where: { callId },
        });
    },
    async delete(id) {
        try {
            await prisma_1.prisma.callImage.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    },
};
