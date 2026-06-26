import { getPool } from '../lib/db';
import { toDate } from '../lib/sql-helpers';
import { CallAttachment, CallAttachmentCreateInput } from '../types/call-models';
import { v4 as uuidv4 } from 'uuid';

export class CallAttachmentRepository {
  /**
   * Create a new attachment for a call.
   */
  static async create(callId: string, data: CallAttachmentCreateInput): Promise<CallAttachment> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO call_attachments (
        id, call_id, filename, path, mimetype, size, source, session_name, message_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        callId,
        data.filename,
        data.path,
        data.mimetype,
        data.size ?? null,
        data.source,
        data.sessionName ?? null,
        data.messageId ?? null,
        now,
      ]
    );

    return {
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
  }

  /**
   * Create multiple attachments.
   */
  static async createMany(callId: string, items: CallAttachmentCreateInput[]): Promise<CallAttachment[]> {
    const attachments: CallAttachment[] = [];
    for (const item of items) {
      attachments.push(await this.create(callId, item));
    }
    return attachments;
  }

  /**
   * Find an attachment by ID within a call.
   */
  static async findById(callId: string, attachmentId: string): Promise<CallAttachment | null> {
    const result = await getPool().query(
      'SELECT * FROM call_attachments WHERE call_id = $1 AND id = $2',
      [callId, attachmentId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToAttachment(result.rows[0]);
  }

  /**
   * Find all attachments for a call.
   */
  static async findByCallId(callId: string, limit = 100): Promise<CallAttachment[]> {
    const result = await getPool().query(
      'SELECT * FROM call_attachments WHERE call_id = $1 ORDER BY created_at ASC LIMIT $2',
      [callId, limit]
    );
    return result.rows.map((row) => this.rowToAttachment(row));
  }

  /**
   * Find attachments by source type.
   */
  static async findBySource(
    callId: string,
    source: 'upload' | 'whatsapp',
    limit = 50
  ): Promise<CallAttachment[]> {
    const result = await getPool().query(
      `SELECT * FROM call_attachments
       WHERE call_id = $1 AND source = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [callId, source, limit]
    );
    return result.rows.map((row) => this.rowToAttachment(row));
  }

  /**
   * Find attachment by message ID.
   */
  static async findByMessageId(callId: string, messageId: string): Promise<CallAttachment | null> {
    const result = await getPool().query(
      'SELECT * FROM call_attachments WHERE call_id = $1 AND message_id = $2 LIMIT 1',
      [callId, messageId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToAttachment(result.rows[0]);
  }

  /**
   * Get attachment count for a call.
   */
  static async countByCallId(callId: string): Promise<number> {
    const result = await getPool().query(
      'SELECT COUNT(*)::int AS count FROM call_attachments WHERE call_id = $1',
      [callId]
    );
    return result.rows[0].count;
  }

  /**
   * Delete an attachment.
   */
  static async delete(callId: string, attachmentId: string): Promise<boolean> {
    const result = await getPool().query(
      'DELETE FROM call_attachments WHERE call_id = $1 AND id = $2',
      [callId, attachmentId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all attachments for a call.
   */
  static async deleteAllByCallId(callId: string): Promise<number> {
    const result = await getPool().query('DELETE FROM call_attachments WHERE call_id = $1', [callId]);
    return result.rowCount ?? 0;
  }

  private static rowToAttachment(row: Record<string, unknown>): CallAttachment {
    return {
      id: String(row.id),
      filename: String(row.filename),
      path: String(row.path),
      mimetype: String(row.mimetype),
      size: row.size !== null && row.size !== undefined ? Number(row.size) : undefined,
      source: row.source as CallAttachment['source'],
      sessionName: row.session_name ? String(row.session_name) : undefined,
      messageId: row.message_id ? String(row.message_id) : undefined,
      createdAt: toDate(row.created_at),
    };
  }
}
