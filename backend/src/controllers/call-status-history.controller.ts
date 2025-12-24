import { Request, Response } from "express";
import { CallStatusHistoryRepository, UserRepository } from '../repositories';

export class CallStatusHistoryController {
  static async getCallStatusHistory(req: Request, res: Response) {
    try {
      const callId = req.params.callId;
      if (!callId) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      const history = await CallStatusHistoryRepository.findByCallId(callId);

      // Enrich with user data
      const enrichedHistory = await Promise.all(
        history.map(async (item) => {
          let user = null;
          if (item.userId) {
            const userDoc = await UserRepository.findById(item.userId);
            if (userDoc) {
              user = {
                id: userDoc.id,
                name: userDoc.name,
                email: userDoc.email
              };
            }
          }
          return {
            ...item,
            user
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error) {
      console.error('Error fetching call status history:', error);
      res.status(500).json({ message: 'Error fetching call status history' });
    }
  }

  static async createStatusHistory(callId: string, oldStatus: string, newStatus: string, userId: string) {
    try {
      const user = await UserRepository.findById(userId);
      return await CallStatusHistoryRepository.create({
        callId,
        oldStatus,
        newStatus,
        userId,
        userName: user?.name
      });
    } catch (error) {
      console.error('Error creating status history:', error);
      throw error;
    }
  }
} 