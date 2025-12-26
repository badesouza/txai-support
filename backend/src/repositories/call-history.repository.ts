import { getFirestore, Collections } from '../lib/firebase';
import {
  CallHistoryEntry,
  CallHistoryEntryCreateInput,
  CallSubcollections,
} from '../types/firestore-models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

/**
 * Repository for managing history entries in the calls/{callId}/history subcollection.
 * 
 * History entries track:
 * - Status changes (OPEN -> IN_PROGRESS -> CLOSED)
 * - Assignment changes
 * - Notes/comments
 * 
 * Benefits:
 * - Complete audit trail for each call
 * - Efficient querying by call
 * - Automatic cleanup when call is deleted
 */
export class CallHistoryRepository {
  /**
   * Get the history subcollection reference for a call.
   */
  private static getHistoryCollection(callId: string) {
    return db
      .collection(Collections.CALLS)
      .doc(callId)
      .collection(CallSubcollections.HISTORY);
  }

  /**
   * Create a new history entry for a call.
   */
  static async create(callId: string, data: CallHistoryEntryCreateInput): Promise<CallHistoryEntry> {
    const id = uuidv4();
    const now = new Date();

    const entry: CallHistoryEntry = {
      id,
      type: data.type,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      userId: data.userId,
      userName: data.userName,
      note: data.note,
      createdAt: now,
    };

    await this.getHistoryCollection(callId).doc(id).set(entry);

    return entry;
  }

  /**
   * Create a status change entry.
   * Convenience method for the most common history entry type.
   */
  static async createStatusChange(
    callId: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    userName?: string
  ): Promise<CallHistoryEntry> {
    return this.create(callId, {
      type: 'status_change',
      oldStatus,
      newStatus,
      userId,
      userName,
    });
  }

  /**
   * Create a note entry.
   */
  static async createNote(
    callId: string,
    userId: string,
    note: string,
    userName?: string
  ): Promise<CallHistoryEntry> {
    return this.create(callId, {
      type: 'note',
      userId,
      userName,
      note,
    });
  }

  /**
   * Find a history entry by ID within a call.
   */
  static async findById(callId: string, entryId: string): Promise<CallHistoryEntry | null> {
    const doc = await this.getHistoryCollection(callId).doc(entryId).get();
    if (!doc.exists) {
      return null;
    }
    return this.docToEntry(doc);
  }

  /**
   * Find all history entries for a call.
   */
  static async findByCallId(callId: string, limit = 100): Promise<CallHistoryEntry[]> {
    const snapshot = await this.getHistoryCollection(callId)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.docToEntry(doc));
  }

  /**
   * Find history entries by type.
   */
  static async findByType(
    callId: string,
    type: 'status_change' | 'assignment' | 'note',
    limit = 50
  ): Promise<CallHistoryEntry[]> {
    const snapshot = await this.getHistoryCollection(callId)
      .where('type', '==', type)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.docToEntry(doc));
  }

  /**
   * Get history count for a call.
   */
  static async countByCallId(callId: string): Promise<number> {
    const snapshot = await this.getHistoryCollection(callId).count().get();
    return snapshot.data().count;
  }

  /**
   * Get the latest history entry for a call.
   */
  static async getLatestEntry(callId: string): Promise<CallHistoryEntry | null> {
    const snapshot = await this.getHistoryCollection(callId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.docToEntry(snapshot.docs[0]);
  }

  /**
   * Delete a history entry.
   * Note: Generally history entries should not be deleted to maintain audit trail.
   */
  static async delete(callId: string, entryId: string): Promise<boolean> {
    const docRef = this.getHistoryCollection(callId).doc(entryId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  /**
   * Delete all history entries for a call.
   * Note: This is typically handled automatically when deleting the call document.
   */
  static async deleteAllByCallId(callId: string): Promise<number> {
    const snapshot = await this.getHistoryCollection(callId).get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }

  /**
   * Convert Firestore document to CallHistoryEntry.
   */
  private static docToEntry(doc: FirebaseFirestore.DocumentSnapshot): CallHistoryEntry {
    const data = doc.data()!;
    return {
      id: doc.id,
      type: data.type,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      userId: data.userId,
      userName: data.userName,
      note: data.note,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    };
  }
}

