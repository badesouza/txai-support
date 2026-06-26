import { getPool } from '../lib/db';
import { getPagination, toDate } from '../lib/sql-helpers';
import {
  Departamento,
  DepartamentoCreateInput,
  DepartamentoUpdateInput,
  PaginationOptions,
  PaginationResult,
} from '../types/models';
import { v4 as uuidv4 } from 'uuid';

export class DepartamentoRepository {
  /** Create a new departamento. */
  static async create(data: DepartamentoCreateInput): Promise<Departamento> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO departamentos (id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [id, data.name.trim(), now, now]
    );

    return { id, name: data.name.trim(), createdAt: now, updatedAt: now };
  }

  /** Find departamento by ID. */
  static async findById(id: string): Promise<Departamento | null> {
    const result = await getPool().query('SELECT * FROM departamentos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToEntity(result.rows[0]);
  }

  /** Find all departamentos ordered by name. */
  static async findAll(): Promise<Departamento[]> {
    const result = await getPool().query('SELECT * FROM departamentos ORDER BY name ASC');
    return result.rows.map((row) => this.rowToEntity(row));
  }

  /** Find departamentos with pagination and optional search. */
  static async findMany(
    options: PaginationOptions & { search?: string } = {}
  ): Promise<PaginationResult<Departamento>> {
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
      `SELECT COUNT(*)::int AS count FROM departamentos ${whereClause}`,
      params
    );
    const total = countResult.rows[0].count;
    const totalPages = Math.ceil(total / limit);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM departamentos ${whereClause}
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

  /** Update departamento by ID. */
  static async update(id: string, data: DepartamentoUpdateInput): Promise<Departamento | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const name = data.name !== undefined ? data.name.trim() : existing.name;

    await getPool().query(
      'UPDATE departamentos SET name = $2, updated_at = $3 WHERE id = $1',
      [id, name, now]
    );

    return { ...existing, name, updatedAt: now };
  }

  /** Delete departamento if not referenced by any call. */
  static async delete(id: string): Promise<{ deleted: boolean; inUse: boolean }> {
    const existing = await this.findById(id);
    if (!existing) {
      return { deleted: false, inUse: false };
    }

    const inUse = await this.isReferencedByCall(id);
    if (inUse) {
      return { deleted: false, inUse: true };
    }

    await getPool().query('DELETE FROM departamentos WHERE id = $1', [id]);
    return { deleted: true, inUse: false };
  }

  /** Check if a departamento is linked to any call. */
  static async isReferencedByCall(id: string): Promise<boolean> {
    const result = await getPool().query(
      'SELECT 1 FROM calls WHERE departamento_id = $1 LIMIT 1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Check if name exists (case-insensitive). */
  static async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const normalized = name.trim().toLowerCase();
    const result = excludeId
      ? await getPool().query(
          'SELECT 1 FROM departamentos WHERE LOWER(name) = $1 AND id <> $2 LIMIT 1',
          [normalized, excludeId]
        )
      : await getPool().query(
          'SELECT 1 FROM departamentos WHERE LOWER(name) = $1 LIMIT 1',
          [normalized]
        );

    return (result.rowCount ?? 0) > 0;
  }

  private static rowToEntity(row: Record<string, unknown>): Departamento {
    return {
      id: String(row.id),
      name: String(row.name),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }
}
