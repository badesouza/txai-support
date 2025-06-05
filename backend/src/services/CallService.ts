import { Call } from "../models/Call";
import { CreateCallDto, UpdateCallDto } from "../dtos/call";
import fs from 'fs/promises';
import path from 'path';

export class CallService {
  /**
   * Retorna todos os chamados, com opção de filtrar por status ou user_id.
   */
  public static async getAll(status?: string, userId?: number): Promise<Call[]> {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (userId !== undefined) {
      whereClause.userId = userId;
    }

    return Call.findAll({
      where: whereClause,
      include: [{ association: "user", attributes: ["id", "name", "email"] }],
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Busca um chamado pelo ID. Lança erro se não encontrar.
   */
  public static async getById(id: number): Promise<Call> {
    const call = await Call.findByPk(id, {
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
  public static async create(data: CreateCallDto): Promise<Call> {
    // Aqui você pode fazer validações adicionais (ex: verificar se user existe)
    // Exemplo básico:
    // const userExists = await User.findByPk(data.user_id);
    // if (!userExists) throw new Error("Usuário não existe");

    const newCall = await Call.create({
      description: data.description,
      userId: data.userId,
      status: data.status ?? "open", // caso envie status por DTO (não obrigatório)
    });
    return newCall;
  }

  /**
   * Atualiza um chamado existente, com os campos permitidos em UpdateCallDto.
   */
  public static async update(id: number, data: UpdateCallDto): Promise<Call> {
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
  public static async delete(id: number): Promise<void> {
    const call = await this.getById(id);
    await call.destroy();
  }

  /**
   * Deleta uma imagem de um chamado
   */
  public static async deleteImage(callId: number, imageId: number): Promise<void> {
    const call = await this.getById(callId);
    
    // Aqui você deve implementar a lógica para encontrar a imagem
    // e deletá-la do sistema de arquivos
    // Por exemplo:
    const imagePath = path.join(__dirname, '../../uploads', `${callId}`, `${imageId}.jpg`);
    
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      throw new Error('Imagem não encontrada ou erro ao deletar');
    }
  }
}
