import { getFirestore, Collections } from '../lib/firebase';
import {
  CallAttachment,
  CallAttachmentCreateInput,
  CallSubcollections,
} from '../types/firestore-models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

/**
 * Repository for managing attachments in the calls/{callId}/attachments subcollection.
 * 
 * This unified attachments collection handles both:
 * - User-uploaded images/files
 * - WhatsApp media (images, videos, documents)
 * 
 * Benefits:
 * - Single place for all call-related files
 * - Automatic cleanup when call is deleted
 * - Easy querying by source type
 */
export class CallAttachmentRepository {
  /**
   * Get the attachments subcollection reference for a call.
   */
  private static getAttachmentsCollection(callId: string) {
    return db
      .collection(Collections.CALLS)
      .doc(callId)
      .collection(CallSubcollections.ATTACHMENTS);
  }

  /**
   * Create a new attachment in a call's attachments subcollection.
   */
  static async create(callId: string, data: CallAttachmentCreateInput): Promise<CallAttachment> {
    const id = uuidv4();
    const now = new Date();

    const attachment: CallAttachment = {
      id,
      filename: data.filename,
      path: data.path,
      mimetype: data.mimetype,
      size: data.size,
      source: data.source,
      sessionName: data.sessionName,
      messageId: data.messageId,
      createdAt: now,
    };

    await this.getAttachmentsCollection(callId).doc(id).set(attachment);

    return attachment;
  }

  /**
   * Create multiple attachments in a batch.
   */
  static async createMany(callId: string, items: CallAttachmentCreateInput[]): Promise<CallAttachment[]> {
    const now = new Date();
    const attachments: CallAttachment[] = [];
    const batch = db.batch();

    for (const data of items) {
      const id = uuidv4();
      const attachment: CallAttachment = {
        id,
        filename: data.filename,
        path: data.path,
        mimetype: data.mimetype,
        size: data.size,
        source: data.source,
        sessionName: data.sessionName,
        messageId: data.messageId,
        createdAt: now,
      };

      batch.set(this.getAttachmentsCollection(callId).doc(id), attachment);
      attachments.push(attachment);
    }

    await batch.commit();
    return attachments;
  }

  /**
   * Find an attachment by ID within a call.
   */
  static async findById(callId: string, attachmentId: string): Promise<CallAttachment | null> {
    const doc = await this.getAttachmentsCollection(callId).doc(attachmentId).get();
    if (!doc.exists) {
      return null;
    }
    return this.docToAttachment(doc);
  }

  /**
   * Find all attachments for a call.
   */
  static async findByCallId(callId: string, limit = 100): Promise<CallAttachment[]> {
    const snapshot = await this.getAttachmentsCollection(callId)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.docToAttachment(doc));
  }

  /**
   * Find attachments by source type (upload or whatsapp).
   */
  static async findBySource(
    callId: string,
    source: 'upload' | 'whatsapp',
    limit = 50
  ): Promise<CallAttachment[]> {
    const snapshot = await this.getAttachmentsCollection(callId)
      .where('source', '==', source)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.docToAttachment(doc));
  }

  /**
   * Find attachment by message ID (for WhatsApp media).
   */
  static async findByMessageId(callId: string, messageId: string): Promise<CallAttachment | null> {
    const snapshot = await this.getAttachmentsCollection(callId)
      .where('messageId', '==', messageId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.docToAttachment(snapshot.docs[0]);
  }

  /**
   * Get attachment count for a call.
   */
  static async countByCallId(callId: string): Promise<number> {
    const snapshot = await this.getAttachmentsCollection(callId).count().get();
    return snapshot.data().count;
  }

  /**
   * Delete an attachment.
   * Note: This only removes the Firestore document. The actual file in GCS
   * should be cleaned up separately if needed.
   */
  static async delete(callId: string, attachmentId: string): Promise<boolean> {
    const docRef = this.getAttachmentsCollection(callId).doc(attachmentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  /**
   * Delete all attachments for a call.
   * Note: This is typically handled automatically when deleting the call document.
   */
  static async deleteAllByCallId(callId: string): Promise<number> {
    const snapshot = await this.getAttachmentsCollection(callId).get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }

  /**
   * Convert Firestore document to CallAttachment.
   */
  private static docToAttachment(doc: FirebaseFirestore.DocumentSnapshot): CallAttachment {
    const data = doc.data()!;
    return {
      id: doc.id,
      filename: data.filename,
      path: data.path,
      mimetype: data.mimetype,
      size: data.size,
      source: data.source,
      sessionName: data.sessionName,
      messageId: data.messageId,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  }
}

