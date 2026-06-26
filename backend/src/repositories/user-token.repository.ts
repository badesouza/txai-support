import { getPool } from '../lib/db';
import { toDate } from '../lib/sql-helpers';
import { UserToken, UserTokenCreateInput } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

export class UserTokenRepository {
  /**
   * Create a new token.
   */
  static async create(data: UserTokenCreateInput): Promise<UserToken> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO user_tokens (id, user_id, token, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, data.userId, data.token, now, now]
    );

    return {
      id,
      userId: data.userId,
      token: data.token,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find token by value.
   */
  static async findByToken(token: string): Promise<UserToken | null> {
    const result = await getPool().query(
      'SELECT * FROM user_tokens WHERE token = $1 LIMIT 1',
      [token]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToToken(result.rows[0]);
  }

  /**
   * Find tokens by user ID.
   */
  static async findByUserId(userId: string): Promise<UserToken[]> {
    const result = await getPool().query(
      'SELECT * FROM user_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map((row) => this.rowToToken(row));
  }

  /**
   * Delete token.
   */
  static async delete(id: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM user_tokens WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete token by value.
   */
  static async deleteByToken(token: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM user_tokens WHERE token = $1', [token]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all tokens for a user.
   */
  static async deleteByUserId(userId: string): Promise<number> {
    const result = await getPool().query('DELETE FROM user_tokens WHERE user_id = $1', [userId]);
    return result.rowCount ?? 0;
  }

  private static rowToToken(row: Record<string, unknown>): UserToken {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      token: String(row.token),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }
}
