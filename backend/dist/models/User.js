"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
exports.UserModel = {
    async create(userData) {
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 10);
        return prisma_1.prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
            },
        });
    },
    async findById(id) {
        return prisma_1.prisma.user.findUnique({
            where: { id },
        });
    },
    async findByEmail(email) {
        return prisma_1.prisma.user.findUnique({
            where: { email },
        });
    },
    async findAll() {
        return prisma_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profile: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },
    async findAllWithPagination({ page, limit, search }) {
        const skip = (page - 1) * limit;
        const where = search ? {
            OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
            ],
        } : {};
        const [total, users] = await Promise.all([
            prisma_1.prisma.user.count({ where }),
            prisma_1.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    profile: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return {
            users,
            total,
        };
    },
    async update(id, userData) {
        const data = { ...userData };
        if (userData.password) {
            data.password = await bcryptjs_1.default.hash(userData.password, 10);
        }
        return prisma_1.prisma.user.update({
            where: { id },
            data,
        });
    },
    async delete(id) {
        try {
            await prisma_1.prisma.user.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    },
    async validatePassword(user, password) {
        try {
            if (!user || !user.password) {
                console.log('Usuário ou senha não encontrados');
                return false;
            }
            const isValid = await bcryptjs_1.default.compare(password, user.password);
            console.log('Resultado da validação da senha:', isValid);
            return isValid;
        }
        catch (error) {
            console.error('Erro ao validar senha:', error);
            return false;
        }
    },
};
