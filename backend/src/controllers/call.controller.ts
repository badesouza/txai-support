// src/controllers/CallController.ts
import { Request, Response } from "express";
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { storage } from '../storage/storage';

interface Call {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export class CallController {
  private static async hydrateImages<T extends { images?: Array<{ path: string }> }>(item: T): Promise<T> {
    if (!item.images || item.images.length === 0) {
      return item;
    }

    const images = await Promise.all(
      item.images.map(async (image) => ({
        ...image,
        path: await storage.getFileUrl(image.path),
      }))
    );

    return {
      ...item,
      images,
    };
  }

  static async listAllCalls(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;

      console.log('Search request:', { search, page, limit }); // Debug log

      let where: Prisma.CallWhereInput | undefined = undefined;
      if (search) {
        const searchId = parseInt(search);
        where = {
          OR: [
            ...(isNaN(searchId) ? [] : [{ id: searchId }]),
            { title: { contains: search } },
            { description: { contains: search } }
          ]
        };
      }

      const [calls, total] = await Promise.all([
        prisma.call.findMany({
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          },
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            images: true
          }
        }),
        prisma.call.count({
          where
        })
      ]);

      // Debug logs
      console.log('Calls with images:', calls.map(call => ({
        id: call.id,
        title: call.title,
        imagesCount: call.images?.length,
        images: call.images
      })));

      const callsWithUrls = await Promise.all(calls.map((call) => CallController.hydrateImages(call)));

      res.json({
        calls: callsWithUrls,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing calls:', error);
      res.status(500).json({ message: 'Error listing calls', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  static async getCallById(req: Request, res: Response) {
    try {
      const callId = parseInt(req.params.id);
      if (isNaN(callId)) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          images: true
        }
      });

      if (!call) {
        return res.status(404).json({ message: 'Call not found' });
      }

      const callWithUrls = await CallController.hydrateImages(call);
      res.json(callWithUrls);
    } catch (error) {
      console.error('Error fetching call:', error);
      res.status(500).json({ message: 'Error fetching call' });
    }
  }

  static async createCall(req: Request, res: Response) {
    try {
      console.log('=== CREATE CALL ===');
      console.log('Request files:', req.files);
      console.log('Request body:', req.body);

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { title, description, status, priority } = req.body;

      // Validar campos obrigatórios
      if (!title || !description) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['title', 'description']
        });
      }

      // Converter status e priority para maiúsculo
      const formattedStatus = status ? status.toUpperCase() : 'OPEN';
      const formattedPriority = priority ? priority.toUpperCase() : 'MEDIUM';

      // Validar valores dos enums
      if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(formattedStatus)) {
        return res.status(400).json({ 
          message: 'Invalid status',
          validStatuses: ['OPEN', 'IN_PROGRESS', 'CLOSED']
        });
      }

      if (!['LOW', 'MEDIUM', 'HIGH'].includes(formattedPriority)) {
        return res.status(400).json({ 
          message: 'Invalid priority',
          validPriorities: ['LOW', 'MEDIUM', 'HIGH']
        });
      }

      console.log('Criando chamado com dados:', {
        title,
        description,
        status: formattedStatus,
        priority: formattedPriority,
        userId,
        files: req.files
      });

      // Criar o chamado com as imagens
      const call = await prisma.call.create({
        data: {
          title,
          description,
          status: formattedStatus,
          priority: formattedPriority,
          userId,
          images: {
            create: Array.isArray(req.files) ? req.files.map((file: Express.Multer.File) => {
              console.log('Criando imagem:', file);
              return {
                filename: file.filename,
                path: file.path
              };
            }) : []
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          images: true
        }
      });

      console.log('Chamado criado:', call);

      const callWithUrls = await CallController.hydrateImages(call);
      res.status(201).json(callWithUrls);
    } catch (error) {
      console.error('Error creating call:', error);
      res.status(500).json({ 
        message: 'Error creating call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateCall(req: Request, res: Response) {
    try {
      const callId = parseInt(req.params.id);
      const { title, description, status, priority } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Buscar o chamado atual para obter o status anterior
      const currentCall = await prisma.call.findUnique({
        where: { id: callId }
      });

      if (!currentCall) {
        return res.status(404).json({ message: 'Call not found' });
      }

      // Atualizar o chamado com as novas imagens
      const updatedCall = await prisma.call.update({
        where: { id: callId },
        data: {
          title,
          description,
          status,
          priority,
          updatedAt: new Date(),
          // Adicionar novas imagens se houver
          images: {
            create: Array.isArray(req.files) ? req.files.map((file: Express.Multer.File) => ({
              filename: file.filename,
              path: file.path
            })) : []
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          images: true
        }
      });

      // Se o status foi alterado, registrar no histórico
      if (status && status !== currentCall.status) {
        await prisma.callStatusHistory.create({
          data: {
            callId,
            oldStatus: currentCall.status,
            newStatus: status,
            userId
          }
        });
      }

      const updatedCallWithUrls = await CallController.hydrateImages(updatedCall);
      res.json(updatedCallWithUrls);
    } catch (error) {
      console.error('Error updating call:', error);
      res.status(500).json({ message: 'Error updating call' });
    }
  }

  static async deleteCall(req: Request, res: Response) {
    try {
      const callId = parseInt(req.params.id);
      if (isNaN(callId)) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      // Delete all related records in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete call status history
        await tx.callStatusHistory.deleteMany({
          where: { callId }
        });

        // Delete call images
        await tx.callImage.deleteMany({
          where: { callId }
        });

        // Finally, delete the call
        await tx.call.delete({
          where: { id: callId }
        });
      });

      res.json({ message: 'Call deleted successfully' });
    } catch (error) {
      console.error('Error deleting call:', error);
      res.status(500).json({ 
        message: 'Error deleting call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getCallStatistics(req: Request, res: Response) {
    try {
      const { dateStart, dateEnd, status } = req.query;
      
      // Build where clause
      const where: Prisma.CallWhereInput = {};
      
      if (dateStart && dateEnd) {
        // Always use UTC for date filtering
        const startDate = new Date(`${dateStart}T00:00:00.000Z`);
        const endDate = new Date(`${dateEnd}T23:59:59.999Z`);

        where.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }
      
      if (status && status !== 'ALL') {
        where.status = status as string;
      }

      // Get calls grouped by status
      const calls = await prisma.call.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true,
        },
      });

      // Format data for chart
      const labels = calls.map(call => call.status);
      const data = calls.map(call => call._count.status);

      res.json({
        labels,
        datasets: [{
          label: 'Chamados',
          data,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        }],
      });
    } catch (error) {
      console.error('Error getting call statistics:', error);
      res.status(500).json({ 
        message: 'Error getting call statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async deleteCallImage(req: Request, res: Response) {
    try {
      const callId = parseInt(req.params.callId);
      const imageId = parseInt(req.params.imageId);

      if (isNaN(callId) || isNaN(imageId)) {
        return res.status(400).json({ message: 'Invalid call ID or image ID' });
      }

      const image = await prisma.callImage.findFirst({
        where: {
          id: imageId,
          callId: callId
        }
      });

      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      await prisma.callImage.delete({
        where: {
          id: imageId,
          callId: callId
        }
      });

      try {
        await storage.deleteFile(image.path);
      } catch (deleteError) {
        console.warn('Error deleting image file:', deleteError);
      }

      res.json({ message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting call image:', error);
      res.status(500).json({ 
        message: 'Error deleting call image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
