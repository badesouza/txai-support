import { getPool } from '../lib/db';
import { toDate } from '../lib/sql-helpers';
import { CallHistoryEntry, CallHistoryEntryCreateInput } from '../types/call-models';
import { v4 as uuidv4 } from 'uuid';

export class CallHistoryRepository {
  /**
   * Create a new history entry for a call.
   */
  static async create(callId: string, data: CallHistoryEntryCreateInput): Promise<CallHistoryEntry> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO call_history (
        id, call_id, type, old_status, new_status, user_id, user_name, note,
        old_value, new_value, field, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        callId,
        data.type,
        data.oldStatus ?? null,
        data.newStatus ?? null,
        data.userId,
        data.userName ?? null,
        data.note ?? null,
        data.oldValue ?? null,
        data.newValue ?? null,
        data.field ?? null,
        now,
      ]
    );

    return {
      id,
      type: data.type,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      userId: data.userId,
      userName: data.userName,
      note: data.note,
      oldValue: data.oldValue,
      newValue: data.newValue,
      field: data.field,
      createdAt: now,
    };
  }

  /**
   * Create a status change entry.
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

  /** Create a department change entry. */
  static async createDepartmentChange(
    callId: string,
    oldValue: string | undefined,
    newValue: string | undefined,
    userId: string,
    userName?: string
  ): Promise<CallHistoryEntry> {
    return this.create(callId, {
      type: 'department_change',
      userId,
      userName,
      oldValue: oldValue || 'Não definido',
      newValue: newValue || 'Não definido',
      field: 'departamento',
    });
  }

  /** Create a local change entry. */
  static async createLocalChange(
    callId: string,
    oldValue: string | undefined,
    newValue: string | undefined,
    userId: string,
    userName?: string
  ): Promise<CallHistoryEntry> {
    return this.create(callId, {
      type: 'local_change',
      userId,
      userName,
      oldValue: oldValue || 'Não definido',
      newValue: newValue || 'Não definido',
      field: 'chamadoLocal',
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
    const result = await getPool().query(
      'SELECT * FROM call_history WHERE call_id = $1 AND id = $2',
      [callId, entryId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToEntry(result.rows[0]);
  }

  /**
   * Find all history entries for a call.
   */
  static async findByCallId(callId: string, limit = 100): Promise<CallHistoryEntry[]> {
    const result = await getPool().query(
      'SELECT * FROM call_history WHERE call_id = $1 ORDER BY created_at ASC LIMIT $2',
      [callId, limit]
    );
    return result.rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Find history entries by type.
   */
  static async findByType(
    callId: string,
    type: 'status_change' | 'assignment' | 'note' | 'department_change' | 'local_change',
    limit = 50
  ): Promise<CallHistoryEntry[]> {
    const result = await getPool().query(
      `SELECT * FROM call_history
       WHERE call_id = $1 AND type = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [callId, type, limit]
    );
    return result.rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Get history count for a call.
   */
  static async countByCallId(callId: string): Promise<number> {
    const result = await getPool().query(
      'SELECT COUNT(*)::int AS count FROM call_history WHERE call_id = $1',
      [callId]
    );
    return result.rows[0].count;
  }

  /**
   * Get the latest history entry for a call.
   */
  static async getLatestEntry(callId: string): Promise<CallHistoryEntry | null> {
    const result = await getPool().query(
      'SELECT * FROM call_history WHERE call_id = $1 ORDER BY created_at DESC LIMIT 1',
      [callId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToEntry(result.rows[0]);
  }

  /**
   * Delete a history entry.
   */
  static async delete(callId: string, entryId: string): Promise<boolean> {
    const result = await getPool().query(
      'DELETE FROM call_history WHERE call_id = $1 AND id = $2',
      [callId, entryId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all history entries for a call.
   */
  static async deleteAllByCallId(callId: string): Promise<number> {
    const result = await getPool().query('DELETE FROM call_history WHERE call_id = $1', [callId]);
    return result.rowCount ?? 0;
  }

  private static rowToEntry(row: Record<string, unknown>): CallHistoryEntry {
    return {
      id: String(row.id),
      type: row.type as CallHistoryEntry['type'],
      oldStatus: row.old_status ? String(row.old_status) : undefined,
      newStatus: row.new_status ? String(row.new_status) : undefined,
      userId: String(row.user_id),
      userName: row.user_name ? String(row.user_name) : undefined,
      note: row.note ? String(row.note) : undefined,
      oldValue: row.old_value ? String(row.old_value) : undefined,
      newValue: row.new_value ? String(row.new_value) : undefined,
      field: row.field as CallHistoryEntry['field'],
      createdAt: toDate(row.created_at),
    };
  }
}
