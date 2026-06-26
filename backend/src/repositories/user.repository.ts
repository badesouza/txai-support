import { getPool } from '../lib/db';
import { getPagination, toDate } from '../lib/sql-helpers';
import { User, UserCreateInput, UserUpdateInput, PaginationResult, PaginationOptions } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  /**
   * Create a new user.
   */
  static async create(data: UserCreateInput): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO users (id, name, email, password, phone, profile, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, data.name, data.email, data.password, data.phone, data.profile, now, now]
    );

    return {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find user by ID.
   */
  static async findById(id: string): Promise<User | null> {
    const result = await getPool().query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToUser(result.rows[0]);
  }

  /**
   * Find user by email.
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await getPool().query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToUser(result.rows[0]);
  }

  /**
   * Find user by phone (with multiple formats).
   */
  static async findByPhone(phone: string): Promise<User | null> {
    const normalizedPhone = phone.replace(/\D/g, '');

    const formatsToTry: { label: string; value: string }[] = [
      { label: 'exact', value: phone },
      { label: 'normalized', value: normalizedPhone },
      { label: 'with 55 prefix', value: `55${normalizedPhone}` },
    ];

    if (normalizedPhone.startsWith('55') && normalizedPhone.length >= 12) {
      const withoutCountry = normalizedPhone.slice(2);
      formatsToTry.push({ label: 'without 55 prefix', value: withoutCountry });

      if (withoutCountry.length === 10) {
        const ddd = withoutCountry.slice(0, 2);
        const number = withoutCountry.slice(2);
        formatsToTry.push({ label: 'BR mobile with 9 added', value: `55${ddd}9${number}` });
        formatsToTry.push({ label: 'BR mobile with 9 added (no 55)', value: `${ddd}9${number}` });
      }

      if (withoutCountry.length === 11 && withoutCountry[2] === '9') {
        const ddd = withoutCountry.slice(0, 2);
        const numberWithoutNine = withoutCountry.slice(3);
        formatsToTry.push({ label: 'BR mobile without 9', value: `55${ddd}${numberWithoutNine}` });
      }
    }

    if (!normalizedPhone.startsWith('55') && normalizedPhone.length >= 10 && normalizedPhone.length === 10) {
      const ddd = normalizedPhone.slice(0, 2);
      const number = normalizedPhone.slice(2);
      formatsToTry.push({ label: 'with 55 and 9 added', value: `55${ddd}9${number}` });
    }

    const uniqueFormats = formatsToTry.filter(
      (format, index, array) => array.findIndex((item) => item.value === format.value) === index
    );

    for (const format of uniqueFormats) {
      const result = await getPool().query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [format.value]);
      if (result.rowCount && result.rowCount > 0) {
        return this.rowToUser(result.rows[0]);
      }
    }

    return null;
  }

  /**
   * Find all users with pagination.
   */
  static async findMany(options: PaginationOptions = {}): Promise<PaginationResult<User>> {
    const { page, limit, offset, orderBy, orderDirection } = getPagination(options);
    const pool = getPool();

    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    const total = countResult.rows[0].count;
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(
      `SELECT * FROM users ORDER BY ${orderBy} ${orderDirection} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      data: result.rows.map((row) => this.rowToUser(row)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update user.
   */
  static async update(id: string, data: UserUpdateInput): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const updated: User = {
      ...existing,
      ...data,
      updatedAt: now,
    };

    await getPool().query(
      `UPDATE users
       SET name = $2, email = $3, password = $4, phone = $5, profile = $6, updated_at = $7
       WHERE id = $1`,
      [id, updated.name, updated.email, updated.password, updated.phone, updated.profile, now]
    );

    return updated;
  }

  /**
   * Delete user.
   */
  static async delete(id: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if email exists.
   */
  static async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const result = excludeId
      ? await getPool().query('SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1', [email, excludeId])
      : await getPool().query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get total count.
   */
  static async getCount(): Promise<number> {
    const result = await getPool().query('SELECT COUNT(*)::int AS count FROM users');
    return result.rows[0].count;
  }

  private static rowToUser(row: Record<string, unknown>): User {
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      password: String(row.password),
      phone: String(row.phone),
      profile: row.profile as User['profile'],
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }
}
