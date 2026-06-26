import { getPool } from '../lib/db';
import { toDate } from '../lib/sql-helpers';
import { CallStatusHistory, CallStatusHistoryCreateInput } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

export class CallStatusHistoryRepository {
  /**
   * Create a new status history entry.
   */
  static async create(data: CallStatusHistoryCreateInput): Promise<CallStatusHistory> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO call_status_history (id, call_id, old_status, new_status, user_id, user_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.callId, data.oldStatus, data.newStatus, data.userId, data.userName ?? null, now]
    );

    return {
      id,
      callId: data.callId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      userId: data.userId,
      userName: data.userName,
      createdAt: now,
    };
  }

  /**
   * Find history by call ID.
   */
  static async findByCallId(callId: string): Promise<CallStatusHistory[]> {
    const result = await getPool().query(
      'SELECT * FROM call_status_history WHERE call_id = $1 ORDER BY created_at DESC',
      [callId]
    );
    return result.rows.map((row) => this.rowToHistory(row));
  }

  /**
   * Find history by user ID.
   */
  static async findByUserId(userId: string, limit = 100): Promise<CallStatusHistory[]> {
    const result = await getPool().query(
      'SELECT * FROM call_status_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows.map((row) => this.rowToHistory(row));
  }

  /**
   * Delete all history for a call.
   */
  static async deleteByCallId(callId: string): Promise<number> {
    const result = await getPool().query('DELETE FROM call_status_history WHERE call_id = $1', [callId]);
    return result.rowCount ?? 0;
  }

  private static rowToHistory(row: Record<string, unknown>): CallStatusHistory {
    return {
      id: String(row.id),
      callId: String(row.call_id),
      oldStatus: String(row.old_status),
      newStatus: String(row.new_status),
      userId: String(row.user_id),
      userName: row.user_name ? String(row.user_name) : undefined,
      createdAt: toDate(row.created_at),
    };
  }
}
