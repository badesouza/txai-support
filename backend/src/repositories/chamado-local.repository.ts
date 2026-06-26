import { getPool } from '../lib/db';
import { getPagination, toDate } from '../lib/sql-helpers';
import {
  ChamadoLocal,
  ChamadoLocalCreateInput,
  ChamadoLocalUpdateInput,
  PaginationOptions,
  PaginationResult,
} from '../types/models';
import { v4 as uuidv4 } from 'uuid';

export class ChamadoLocalRepository {
  /** Create a new chamado local. */
  static async create(data: ChamadoLocalCreateInput): Promise<ChamadoLocal> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO chamado_locais (id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [id, data.name.trim(), now, now]
    );

    return { id, name: data.name.trim(), createdAt: now, updatedAt: now };
  }

  /** Find chamado local by ID. */
  static async findById(id: string): Promise<ChamadoLocal | null> {
    const result = await getPool().query('SELECT * FROM chamado_locais WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToEntity(result.rows[0]);
  }

  /** Find all chamado locais ordered by name. */
  static async findAll(): Promise<ChamadoLocal[]> {
    const result = await getPool().query('SELECT * FROM chamado_locais ORDER BY name ASC');
    return result.rows.map((row) => this.rowToEntity(row));
  }

  /** Find chamado locais with pagination and optional search. */
  static async findMany(
    options: PaginationOptions & { search?: string } = {}
  ): Promise<PaginationResult<ChamadoLocal>> {
    const { page, limit, offset, orderBy, orderDirection } = getPagination({
      ...options,
      orderBy: options.orderBy ?? 'name',
      orderDirection: options.orderDirection ?? 'asc',
    });
    const pool = getPool();
    const search = options.search?.trim();

    const params: unknown[] = [];
    let whereClause = '';
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      whereClause = `WHERE LOWER(name) LIKE $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM chamado_locais ${whereClause}`,
      params
    );
    const total = countResult.rows[0].count;
    const totalPages = Math.ceil(total / limit);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM chamado_locais ${whereClause}
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      data: result.rows.map((row) => this.rowToEntity(row)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /** Update chamado local by ID. */
  static async update(id: string, data: ChamadoLocalUpdateInput): Promise<ChamadoLocal | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const name = data.name !== undefined ? data.name.trim() : existing.name;

    await getPool().query(
      'UPDATE chamado_locais SET name = $2, updated_at = $3 WHERE id = $1',
      [id, name, now]
    );

    return { ...existing, name, updatedAt: now };
  }

  /** Delete chamado local if not referenced by any call. */
  static async delete(id: string): Promise<{ deleted: boolean; inUse: boolean }> {
    const existing = await this.findById(id);
    if (!existing) {
      return { deleted: false, inUse: false };
    }

    const inUse = await this.isReferencedByCall(id);
    if (inUse) {
      return { deleted: false, inUse: true };
    }

    await getPool().query('DELETE FROM chamado_locais WHERE id = $1', [id]);
    return { deleted: true, inUse: false };
  }

  /** Check if a chamado local is linked to any call. */
  static async isReferencedByCall(id: string): Promise<boolean> {
    const result = await getPool().query(
      'SELECT 1 FROM calls WHERE chamado_local_id = $1 LIMIT 1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Check if name exists (case-insensitive). */
  static async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const normalized = name.trim().toLowerCase();
    const result = excludeId
      ? await getPool().query(
          'SELECT 1 FROM chamado_locais WHERE LOWER(name) = $1 AND id <> $2 LIMIT 1',
          [normalized, excludeId]
        )
      : await getPool().query(
          'SELECT 1 FROM chamado_locais WHERE LOWER(name) = $1 LIMIT 1',
          [normalized]
        );

    return (result.rowCount ?? 0) > 0;
  }

  private static async getCount(): Promise<number> {
    const result = await getPool().query('SELECT COUNT(*)::int AS count FROM chamado_locais');
    return result.rows[0].count;
  }

  private static rowToEntity(row: Record<string, unknown>): ChamadoLocal {
    return {
      id: String(row.id),
      name: String(row.name),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }
}
