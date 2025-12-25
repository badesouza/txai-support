import { getFirestore, Collections } from '../lib/firebase';
import { WhatsAppMessage, WhatsAppMessageCreateInput } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();
const collection = db.collection(Collections.WHATSAPP_MESSAGES);

export class WhatsAppMessageRepository {
  /**
   * Create a new WhatsApp message
   */
  static async create(data: WhatsAppMessageCreateInput): Promise<WhatsAppMessage> {
    const id = uuidv4();
    const now = new Date();
    
    const message: WhatsAppMessage = {
      id,
      callId: data.callId,
      userId: data.userId,
      phone: data.phone,
      message: data.message,
      messageType: data.messageType || 'text',
      isFromUser: data.isFromUser ?? true,
      createdAt: now,
    };

    await collection.doc(id).set(message);
    
    return message;
  }

  /**
   * Find message by ID
   */
  static async findById(id: string): Promise<WhatsAppMessage | null> {
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.docToMessage(doc);
  }

  /**
   * Find messages by call ID
   */
  static async findByCallId(callId: string, limit = 100): Promise<WhatsAppMessage[]> {
    const snapshot = await collection
      .where('callId', '==', callId)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => this.docToMessage(doc));
  }

  /**
   * Find messages by phone number
   */
  static async findByPhone(phone: string, limit = 20): Promise<WhatsAppMessage[]> {
    const snapshot = await collection
      .where('phone', '==', phone)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => this.docToMessage(doc));
  }

  /**
   * Find messages by user ID
   */
  static async findByUserId(userId: string, limit = 100): Promise<WhatsAppMessage[]> {
    const snapshot = await collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => this.docToMessage(doc));
  }

  /**
   * Delete message
   */
  static async delete(id: string): Promise<boolean> {
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  /**
   * Delete all messages for a call
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
   * Convert Firestore document to WhatsAppMessage
   */
  private static docToMessage(doc: FirebaseFirestore.DocumentSnapshot): WhatsAppMessage {
    const data = doc.data()!;
    return {
      id: doc.id,
      callId: data.callId,
      userId: data.userId,
      phone: data.phone,
      message: data.message,
      messageType: data.messageType,
      isFromUser: data.isFromUser,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  }
}

