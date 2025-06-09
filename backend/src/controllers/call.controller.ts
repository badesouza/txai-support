// src/controllers/CallController.ts
import { Request, Response } from "express";
import { prisma } from '../lib/prisma';

export class CallController {
  static async listAllCalls(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [calls, total] = await Promise.all([
        prisma.call.findMany({
          skip,
          take: limit,
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.call.count()
      ]);

      res.json({
        calls,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing calls:', error);
      res.status(500).json({ message: 'Error listing calls' });
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

      res.json(call);
    } catch (error) {
      console.error('Error fetching call:', error);
      res.status(500).json({ message: 'Error fetching call' });
    }
  }

  static async createCall(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { title, description, status, priority } = req.body;

      const call = await prisma.call.create({
        data: {
          title,
          description,
          status,
          priority,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      res.status(201).json(call);
    } catch (error) {
      console.error('Error creating call:', error);
      res.status(500).json({ message: 'Error creating call' });
    }
  }

  static async updateCall(req: Request, res: Response) {
    try {
      const callId = parseInt(req.params.id);
      if (isNaN(callId)) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      const { title, description, status, priority } = req.body;

      const call = await prisma.call.update({
        where: { id: callId },
        data: {
          title,
          description,
          status,
          priority
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

      res.json(call);
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

      // Primeiro, deletar todas as imagens associadas ao chamado
      await prisma.callImage.deleteMany({
        where: { callId }
      });

      // Depois, deletar o chamado
      await prisma.call.delete({
        where: { id: callId }
      });

      res.json({ message: 'Call deleted successfully' });
    } catch (error) {
      console.error('Error deleting call:', error);
      res.status(500).json({ message: 'Error deleting call' });
    }
  }
}
