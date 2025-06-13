import { Request, Response } from "express";
import { prisma } from '../lib/prisma';

export class CallStatusHistoryController {
  static async getCallStatusHistory(req: Request, res: Response) {
    try {
      const callId = parseInt(req.params.callId);
      if (isNaN(callId)) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      const history = await prisma.callStatusHistory.findMany({
        where: {
          callId
        },
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

      res.json(history);
    } catch (error) {
      console.error('Error fetching call status history:', error);
      res.status(500).json({ message: 'Error fetching call status history' });
    }
  }

  static async createStatusHistory(callId: number, oldStatus: string, newStatus: string, userId: number) {
    try {
      return await prisma.callStatusHistory.create({
        data: {
          callId,
          oldStatus,
          newStatus,
          userId
        }
      });
    } catch (error) {
      console.error('Error creating status history:', error);
      throw error;
    }
  }
} 