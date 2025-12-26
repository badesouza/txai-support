import { getFirestore, Collections } from '../lib/firebase';
import {
  CallMessage,
  CallMessageCreateInput,
  CallSubcollections,
} from '../types/firestore-models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

/**
 * Repository for managing messages in the calls/{callId}/messages subcollection.
 * 
 * Messages are stored as a subcollection under each call for:
 * - Efficient querying (all messages for a call in one query)
 * - Automatic cleanup when call is deleted
 * - Better Firestore indexing
 */
export class CallMessageRepository {
  /**
   * Get the messages subcollection reference for a call.
   */
  private static getMessagesCollection(callId: string) {
    return db
      .collection(Collections.CALLS)
      .doc(callId)
      .collection(CallSubcollections.MESSAGES);
  }

  /**
   * Create a new message in a call's messages subcollection.
   */
  static async create(callId: string, data: CallMessageCreateInput): Promise<CallMessage> {
    const id = uuidv4();
    const now = new Date();

    const message: CallMessage = {
      id,
      content: data.content,
      messageType: data.messageType || 'text',
      source: data.source,
      sessionName: data.sessionName,
      direction: data.direction,
      senderPhone: data.senderPhone,
      senderName: data.senderName,
      attachmentId: data.attachmentId,
      externalMessageId: data.externalMessageId,
      createdAt: now,
    };

    await this.getMessagesCollection(callId).doc(id).set(message);

    return message;
  }

  /**
   * Find a message by ID within a call.
   */
  static async findById(callId: string, messageId: string): Promise<CallMessage | null> {
    const doc = await this.getMessagesCollection(callId).doc(messageId).get();
    if (!doc.exists) {
      return null;
    }
    return this.docToMessage(doc);
  }

  /**
   * Find all messages for a call.
   */
  static async findByCallId(callId: string, limit = 100): Promise<CallMessage[]> {
    const snapshot = await this.getMessagesCollection(callId)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.docToMessage(doc));
  }

  /**
   * Find messages by external message ID (for deduplication).
   */
  static async findByExternalId(callId: string, externalMessageId: string): Promise<CallMessage | null> {
    const snapshot = await this.getMessagesCollection(callId)
      .where('externalMessageId', '==', externalMessageId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.docToMessage(snapshot.docs[0]);
  }

  /**
   * Find messages by session name within a call.
   */
  static async findBySession(callId: string, sessionName: string, limit = 50): Promise<CallMessage[]> {
    const snapshot = await this.getMessagesCollection(callId)
      .where('sessionName', '==', sessionName)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.docToMessage(doc));
  }

  /**
   * Get message count for a call.
   */
  static async countByCallId(callId: string): Promise<number> {
    const snapshot = await this.getMessagesCollection(callId).count().get();
    return snapshot.data().count;
  }

  /**
   * Get the latest message for a call.
   */
  static async getLatestMessage(callId: string): Promise<CallMessage | null> {
    const snapshot = await this.getMessagesCollection(callId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.docToMessage(snapshot.docs[0]);
  }

  /**
   * Delete a message.
   */
  static async delete(callId: string, messageId: string): Promise<boolean> {
    const docRef = this.getMessagesCollection(callId).doc(messageId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  /**
   * Delete all messages for a call.
   * Note: This is typically handled automatically when deleting the call document,
   * but can be used for manual cleanup.
   */
  static async deleteAllByCallId(callId: string): Promise<number> {
    const snapshot = await this.getMessagesCollection(callId).get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }

  /**
   * Convert Firestore document to CallMessage.
   */
  private static docToMessage(doc: FirebaseFirestore.DocumentSnapshot): CallMessage {
    const data = doc.data()!;
    return {
      id: doc.id,
      content: data.content,
      messageType: data.messageType,
      source: data.source,
      sessionName: data.sessionName,
      direction: data.direction,
      senderPhone: data.senderPhone,
      senderName: data.senderName,
      attachmentId: data.attachmentId,
      externalMessageId: data.externalMessageId,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  }
}

