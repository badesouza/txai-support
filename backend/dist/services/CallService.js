"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallService = void 0;
const Call_1 = require("../models/Call");
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
        return Call_1.Call.findAll({
            where: whereClause,
            include: [{ association: "user", attributes: ["id", "name", "email"] }],
            order: [["createdAt", "DESC"]],
        });
    }
    /**
     * Busca um chamado pelo ID. Lança erro se não encontrar.
     */
    static async getById(id) {
        const call = await Call_1.Call.findByPk(id, {
            include: [{ association: "user", attributes: ["id", "name", "email"] }],
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
        // Aqui você pode fazer validações adicionais (ex: verificar se user existe)
        // Exemplo básico:
        // const userExists = await User.findByPk(data.user_id);
        // if (!userExists) throw new Error("Usuário não existe");
        const newCall = await Call_1.Call.create({
            description: data.description,
            userId: data.userId,
            status: data.status ?? "open", // caso envie status por DTO (não obrigatório)
        });
        return newCall;
    }
    /**
     * Atualiza um chamado existente, com os campos permitidos em UpdateCallDto.
     */
    static async update(id, data) {
        const call = await this.getById(id);
        await call.update({
            description: data.description ?? call.description,
            status: data.status ?? call.status,
        });
        return call;
    }
    /**
     * Exclui um chamado pelo ID.
     */
    static async delete(id) {
        const call = await this.getById(id);
        await call.destroy();
    }
}
exports.CallService = CallService;
