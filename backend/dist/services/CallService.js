"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallService = void 0;
const prisma_1 = require("../lib/prisma");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class CallService {
    /**
     * Retorna todos os chamados, com opção de filtrar por status ou user_id.
     */
    static async getAll(status, userId) {
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        if (userId !== undefined) {
            whereClause.userId = userId;
        }
        return prisma_1.prisma.call.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    /**
     * Busca um chamado pelo ID. Lança erro se não encontrar.
     */
    static async getById(id) {
        const call = await prisma_1.prisma.call.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!call) {
            throw new Error("Chamado não encontrado");
        }
        return call;
    }
    /**
     * Cria um novo chamado. Recebe dados tipados pelo CreateCallDto.
     */
    static async create(data) {
        return prisma_1.prisma.call.create({
            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                priority: data.priority,
                userId: data.userId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    /**
     * Atualiza um chamado existente, com os campos permitidos em UpdateCallDto.
     */
    static async update(id, data) {
        const updateData = {};
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.priority !== undefined)
            updateData.priority = data.priority;
        return prisma_1.prisma.call.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    /**
     * Exclui um chamado pelo ID.
     */
    static async delete(id) {
        await prisma_1.prisma.call.delete({
            where: { id }
        });
    }
    /**
     * Deleta uma imagem de um chamado
     */
    static async deleteImage(callId, imageId) {
        // Primeiro, buscar a imagem para obter o caminho do arquivo
        const image = await prisma_1.prisma.callImage.findFirst({
            where: {
                id: imageId,
                callId: callId
            }
        });
        if (!image) {
            throw new Error('Imagem não encontrada');
        }
        // Deletar do banco de dados
        await prisma_1.prisma.callImage.delete({
            where: { id: imageId }
        });
        // Tentar deletar o arquivo físico (opcional)
        try {
            const imagePath = path_1.default.join(__dirname, '../../uploads', image.filename);
            await promises_1.default.unlink(imagePath);
        }
        catch (error) {
            console.warn('Erro ao deletar arquivo físico:', error);
            // Não falhar se o arquivo não existir
        }
    }
}
exports.CallService = CallService;
