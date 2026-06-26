import { getPool } from '../lib/db';
import { toDate } from '../lib/sql-helpers';
import { CallMessage, CallMessageCreateInput } from '../types/call-models';
import { v4 as uuidv4 } from 'uuid';

export class CallMessageRepository {
  /**
   * Create a new message for a call.
   */
  static async create(callId: string, data: CallMessageCreateInput): Promise<CallMessage> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO call_messages (
        id, call_id, content, message_type, source, session_name, direction,
        sender_phone, sender_name, attachment_id, external_message_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        callId,
        data.content,
        data.messageType || 'text',
        data.source,
        data.sessionName ?? null,
        data.direction,
        data.senderPhone ?? null,
        data.senderName ?? null,
        data.attachmentId ?? null,
        data.externalMessageId ?? null,
        now,
      ]
    );

    return {
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
  }

  /**
   * Find a message by ID within a call.
   */
  static async findById(callId: string, messageId: string): Promise<CallMessage | null> {
    const result = await getPool().query(
      'SELECT * FROM call_messages WHERE call_id = $1 AND id = $2',
      [callId, messageId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToMessage(result.rows[0]);
  }

  /**
   * Find all messages for a call.
   */
  static async findByCallId(callId: string, limit = 100): Promise<CallMessage[]> {
    const result = await getPool().query(
      'SELECT * FROM call_messages WHERE call_id = $1 ORDER BY created_at ASC LIMIT $2',
      [callId, limit]
    );
    return result.rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Find messages by external message ID.
   */
  static async findByExternalId(callId: string, externalMessageId: string): Promise<CallMessage | null> {
    const result = await getPool().query(
      'SELECT * FROM call_messages WHERE call_id = $1 AND external_message_id = $2 LIMIT 1',
      [callId, externalMessageId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToMessage(result.rows[0]);
  }

  /**
   * Find messages by session name within a call.
   */
  static async findBySession(callId: string, sessionName: string, limit = 50): Promise<CallMessage[]> {
    const result = await getPool().query(
      `SELECT * FROM call_messages
       WHERE call_id = $1 AND session_name = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [callId, sessionName, limit]
    );
    return result.rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Get message count for a call.
   */
  static async countByCallId(callId: string): Promise<number> {
    const result = await getPool().query(
      'SELECT COUNT(*)::int AS count FROM call_messages WHERE call_id = $1',
      [callId]
    );
    return result.rows[0].count;
  }

  /**
   * Get the latest message for a call.
   */
  static async getLatestMessage(callId: string): Promise<CallMessage | null> {
    const result = await getPool().query(
      'SELECT * FROM call_messages WHERE call_id = $1 ORDER BY created_at DESC LIMIT 1',
      [callId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToMessage(result.rows[0]);
  }

  /**
   * Delete a message.
   */
  static async delete(callId: string, messageId: string): Promise<boolean> {
    const result = await getPool().query(
      'DELETE FROM call_messages WHERE call_id = $1 AND id = $2',
      [callId, messageId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all messages for a call.
   */
  static async deleteAllByCallId(callId: string): Promise<number> {
    const result = await getPool().query('DELETE FROM call_messages WHERE call_id = $1', [callId]);
    return result.rowCount ?? 0;
  }

  private static rowToMessage(row: Record<string, unknown>): CallMessage {
    return {
      id: String(row.id),
      content: String(row.content),
      messageType: row.message_type as CallMessage['messageType'],
      source: row.source as CallMessage['source'],
      sessionName: row.session_name ? String(row.session_name) : undefined,
      direction: row.direction as CallMessage['direction'],
      senderPhone: row.sender_phone ? String(row.sender_phone) : undefined,
      senderName: row.sender_name ? String(row.sender_name) : undefined,
      attachmentId: row.attachment_id ? String(row.attachment_id) : undefined,
      externalMessageId: row.external_message_id ? String(row.external_message_id) : undefined,
      createdAt: toDate(row.created_at),
    };
  }
}
