import { getPool } from '../lib/db';
import { toDate } from '../lib/sql-helpers';
import { WhatsAppMessage, WhatsAppMessageCreateInput } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

export class WhatsAppMessageRepository {
  /**
   * Create a new WhatsApp message.
   */
  static async create(data: WhatsAppMessageCreateInput): Promise<WhatsAppMessage> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO whatsapp_messages (
        id, call_id, user_id, phone, message, message_type, is_from_user,
        media_path, media_filename, media_mimetype, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        data.callId ?? null,
        data.userId ?? null,
        data.phone,
        data.message,
        data.messageType || 'text',
        data.isFromUser ?? true,
        data.mediaPath ?? null,
        data.mediaFilename ?? null,
        data.mediaMimetype ?? null,
        now,
      ]
    );

    return {
      id,
      callId: data.callId,
      userId: data.userId,
      phone: data.phone,
      message: data.message,
      messageType: data.messageType || 'text',
      isFromUser: data.isFromUser ?? true,
      mediaPath: data.mediaPath,
      mediaFilename: data.mediaFilename,
      mediaMimetype: data.mediaMimetype,
      createdAt: now,
    };
  }

  /**
   * Find message by ID.
   */
  static async findById(id: string): Promise<WhatsAppMessage | null> {
    const result = await getPool().query('SELECT * FROM whatsapp_messages WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToMessage(result.rows[0]);
  }

  /**
   * Find messages by call ID.
   */
  static async findByCallId(callId: string, limit = 100): Promise<WhatsAppMessage[]> {
    const result = await getPool().query(
      'SELECT * FROM whatsapp_messages WHERE call_id = $1 ORDER BY created_at ASC LIMIT $2',
      [callId, limit]
    );
    return result.rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Find messages by phone number.
   */
  static async findByPhone(phone: string, limit = 20): Promise<WhatsAppMessage[]> {
    const result = await getPool().query(
      'SELECT * FROM whatsapp_messages WHERE phone = $1 ORDER BY created_at DESC LIMIT $2',
      [phone, limit]
    );
    return result.rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Find messages by user ID.
   */
  static async findByUserId(userId: string, limit = 100): Promise<WhatsAppMessage[]> {
    const result = await getPool().query(
      'SELECT * FROM whatsapp_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Delete message.
   */
  static async delete(id: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM whatsapp_messages WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all messages for a call.
   */
  static async deleteByCallId(callId: string): Promise<number> {
    const result = await getPool().query('DELETE FROM whatsapp_messages WHERE call_id = $1', [callId]);
    return result.rowCount ?? 0;
  }

  private static rowToMessage(row: Record<string, unknown>): WhatsAppMessage {
    return {
      id: String(row.id),
      callId: row.call_id ? String(row.call_id) : undefined,
      userId: row.user_id ? String(row.user_id) : undefined,
      phone: String(row.phone),
      message: String(row.message),
      messageType: String(row.message_type),
      isFromUser: Boolean(row.is_from_user),
      mediaPath: row.media_path ? String(row.media_path) : undefined,
      mediaFilename: row.media_filename ? String(row.media_filename) : undefined,
      mediaMimetype: row.media_mimetype ? String(row.media_mimetype) : undefined,
      createdAt: toDate(row.created_at),
    };
  }
}
