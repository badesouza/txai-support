import { getFirestore, Collections } from '../lib/firebase';
import { CallStatusHistory, CallStatusHistoryCreateInput } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();
const collection = db.collection(Collections.CALL_STATUS_HISTORY);

export class CallStatusHistoryRepository {
  /**
   * Create a new status history entry
   */
  static async create(data: CallStatusHistoryCreateInput): Promise<CallStatusHistory> {
    const id = uuidv4();
    const now = new Date();
    
    const history: CallStatusHistory = {
      id,
      callId: data.callId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      userId: data.userId,
      userName: data.userName,
      createdAt: now,
    };

    await collection.doc(id).set(history);
    
    return history;
  }

  /**
   * Find history by call ID
   */
  static async findByCallId(callId: string): Promise<CallStatusHistory[]> {
    const snapshot = await collection
      .where('callId', '==', callId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => this.docToHistory(doc));
  }

  /**
   * Find history by user ID
   */
  static async findByUserId(userId: string, limit = 100): Promise<CallStatusHistory[]> {
    const snapshot = await collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => this.docToHistory(doc));
  }

  /**
   * Delete all history for a call
   */
  static async deleteByCallId(callId: string): Promise<number> {
    const snapshot = await collection
      .where('callId', '==', callId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    return snapshot.size;
  }

  /**
   * Convert Firestore document to CallStatusHistory
   */
  private static docToHistory(doc: FirebaseFirestore.DocumentSnapshot): CallStatusHistory {
    const data = doc.data()!;
    return {
      id: doc.id,
      callId: data.callId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      userId: data.userId,
      userName: data.userName,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  }
}

