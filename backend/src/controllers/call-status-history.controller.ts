import { Request, Response } from "express";
import { CallHistoryRepository, UserRepository } from '../repositories';

export class CallStatusHistoryController {
  /** Get unified call history from subcollection (status, department, local). */
  static async getCallStatusHistory(req: Request, res: Response) {
    try {
      const callId = req.params.callId;
      if (!callId) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      const history = await CallHistoryRepository.findByCallId(callId);

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
            id: item.id,
            callId,
            type: item.type,
            oldStatus: item.oldStatus,
            newStatus: item.newStatus,
            oldValue: item.oldValue,
            newValue: item.newValue,
            field: item.field,
            userId: item.userId,
            userName: item.userName,
            note: item.note,
            createdAt: item.createdAt,
            user,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error) {
      console.error('Error fetching call status history:', error);
      res.status(500).json({ message: 'Error fetching call status history' });
    }
  }
}
