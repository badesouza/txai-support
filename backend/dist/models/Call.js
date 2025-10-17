"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallModel = void 0;
const prisma_1 = require("../lib/prisma");
exports.CallModel = {
    async create(callData) {
        return prisma_1.prisma.call.create({
            data: {
                ...callData,
                status: callData.status || 'OPEN',
                priority: callData.priority || 'MEDIUM',
            },
        });
    },
    async findById(id) {
        return prisma_1.prisma.call.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                images: true,
            },
        });
    },
    async findAll() {
        return prisma_1.prisma.call.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                images: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },
    async findAllWithPagination({ page, limit, search }) {
        const skip = (page - 1) * limit;
        const where = search ? {
            OR: [
                { title: { contains: search } },
                { description: { contains: search } },
            ],
        } : {};
        const [total, calls] = await Promise.all([
            prisma_1.prisma.call.count({ where }),
            prisma_1.prisma.call.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    images: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return {
            calls,
            total,
        };
    },
    async update(id, callData) {
        return prisma_1.prisma.call.update({
            where: { id },
            data: callData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                images: true,
            },
        });
    },
    async delete(id) {
        try {
            await prisma_1.prisma.call.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    },
};
