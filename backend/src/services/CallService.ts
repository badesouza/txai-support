import { prisma } from "../lib/prisma";
import { CreateCallDto, UpdateCallDto } from "../dtos/call";
import fs from 'fs/promises';
import path from 'path';

export class CallService {
  /**
   * Retorna todos os chamados, com opção de filtrar por status ou user_id.
   */
  public static async getAll(status?: string, userId?: number) {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (userId !== undefined) {
      whereClause.userId = userId;
    }

    return prisma.call.findMany({
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
  public static async getById(id: number) {
    const call = await prisma.call.findUnique({
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
  public static async create(data: CreateCallDto) {
    return prisma.call.create({
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
  public static async update(id: number, data: UpdateCallDto) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;

    return prisma.call.update({
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
  public static async delete(id: number): Promise<void> {
    await prisma.call.delete({
      where: { id }
    });
  }

  /**
   * Deleta uma imagem de um chamado
   */
  public static async deleteImage(callId: number, imageId: number): Promise<void> {
    // Primeiro, buscar a imagem para obter o caminho do arquivo
    const image = await prisma.callImage.findFirst({
      where: {
        id: imageId,
        callId: callId
      }
    });

    if (!image) {
      throw new Error('Imagem não encontrada');
    }

    // Deletar do banco de dados
    await prisma.callImage.delete({
      where: { id: imageId }
    });

    // Tentar deletar o arquivo físico (opcional)
    try {
      const imagePath = path.join(__dirname, '../../uploads', image.filename);
      await fs.unlink(imagePath);
    } catch (error) {
      console.warn('Erro ao deletar arquivo físico:', error);
      // Não falhar se o arquivo não existir
    }
  }
}
