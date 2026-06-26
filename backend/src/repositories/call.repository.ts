import { getPool } from '../lib/db';
import { getPagination, parseImageUrls, toDate } from '../lib/sql-helpers';
import { Call, CallCreateInput, CallUpdateInput, CallImage, CallImageCreateInput, PaginationResult, PaginationOptions } from '../types/models';
import { CallMessage, CallAttachment, CallHistoryEntry } from '../types/call-models';
import { CallMessageRepository } from './call-message.repository';
import { CallAttachmentRepository } from './call-attachment.repository';
import { CallHistoryRepository } from './call-history.repository';
import { v4 as uuidv4 } from 'uuid';

export class CallRepository {
  /**
   * Create a new call.
   */
  static async create(data: CallCreateInput): Promise<Call> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO calls (
        id, title, description, status, priority, user_id, user_name, user_email, user_phone,
        chamado_local_id, chamado_local_name, departamento_id, departamento_name, image_urls,
        message_count, attachment_count, last_activity_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19
      )`,
      [
        id,
        data.title,
        data.description,
        data.status || 'OPEN',
        data.priority || 'MEDIUM',
        data.userId,
        data.userName ?? null,
        data.userEmail ?? null,
        data.userPhone ?? null,
        data.chamadoLocalId ?? null,
        data.chamadoLocalName ?? null,
        data.departamentoId ?? null,
        data.departamentoName ?? null,
        JSON.stringify([]),
        0,
        0,
        now,
        now,
        now,
      ]
    );

    return {
      id,
      title: data.title,
      description: data.description,
      status: data.status || 'OPEN',
      priority: data.priority || 'MEDIUM',
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      chamadoLocalId: data.chamadoLocalId,
      chamadoLocalName: data.chamadoLocalName,
      departamentoId: data.departamentoId,
      departamentoName: data.departamentoName,
      imageUrls: [],
      messageCount: 0,
      attachmentCount: 0,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find call by ID.
   */
  static async findById(id: string): Promise<Call | null> {
    const result = await getPool().query('SELECT * FROM calls WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToCall(result.rows[0]);
  }

  /**
   * Find call by ID with images.
   */
  static async findByIdWithImages(id: string): Promise<(Call & { images: CallImage[] }) | null> {
    const call = await this.findById(id);
    if (!call) {
      return null;
    }

    const images = await this.getCallImages(id);
    return { ...call, images };
  }

  /**
   * Find all calls with pagination.
   */
  static async findMany(options: PaginationOptions & { search?: string; userId?: string } = {}): Promise<PaginationResult<Call & { images: CallImage[] }>> {
    const { page, limit, offset, orderBy, orderDirection } = getPagination(options);
    const pool = getPool();
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options.userId) {
      params.push(options.userId);
      conditions.push(`user_id = $${params.length}`);
    }

    if (options.search) {
      const search = `%${options.search.toLowerCase()}%`;
      params.push(search, search, search, search, `%${options.search}%`);
      const base = params.length - 4;
      conditions.push(`(
        LOWER(title) LIKE $${base}
        OR LOWER(description) LIKE $${base + 1}
        OR LOWER(COALESCE(chamado_local_name, '')) LIKE $${base + 2}
        OR LOWER(COALESCE(departamento_name, '')) LIKE $${base + 3}
        OR id::text LIKE $${base + 4}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM calls ${whereClause}`,
      params
    );
    const total = countResult.rows[0].count;
    const totalPages = Math.ceil(total / limit);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM calls ${whereClause}
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const calls = result.rows.map((row) => this.rowToCall(row));
    const callsWithImages = await Promise.all(
      calls.map(async (call) => ({
        ...call,
        images: await this.getCallImages(call.id),
      }))
    );

    return {
      data: callsWithImages,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find calls by user ID.
   */
  static async findByUserId(userId: string, options: PaginationOptions = {}): Promise<PaginationResult<Call>> {
    return this.findMany({ ...options, userId });
  }

  /**
   * Find active call for user (OPEN or IN_PROGRESS).
   */
  static async findActiveCallForUser(userId: string): Promise<Call | null> {
    const result = await getPool().query(
      `SELECT * FROM calls
       WHERE user_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.rowToCall(result.rows[0]);
  }

  /**
   * Update call.
   */
  static async update(id: string, data: CallUpdateInput): Promise<Call | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const updated: Call = {
      ...existing,
      ...data,
      departamentoId: data.departamentoId === null ? undefined : data.departamentoId ?? existing.departamentoId,
      departamentoName: data.departamentoName === null ? undefined : data.departamentoName ?? existing.departamentoName,
      updatedAt: now,
    };

    await getPool().query(
      `UPDATE calls SET
        title = $2,
        description = $3,
        status = $4,
        priority = $5,
        chamado_local_id = $6,
        chamado_local_name = $7,
        departamento_id = $8,
        departamento_name = $9,
        updated_at = $10
       WHERE id = $1`,
      [
        id,
        updated.title,
        updated.description,
        updated.status,
        updated.priority,
        updated.chamadoLocalId ?? null,
        updated.chamadoLocalName ?? null,
        updated.departamentoId ?? null,
        updated.departamentoName ?? null,
        now,
      ]
    );

    return updated;
  }

  /**
   * Delete call and related data.
   */
  static async delete(id: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM calls WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Add image to call.
   */
  static async addImage(data: CallImageCreateInput): Promise<CallImage> {
    const id = uuidv4();
    const now = new Date();

    await getPool().query(
      `INSERT INTO call_images (id, filename, path, call_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, data.filename, data.path, data.callId, now, now]
    );

    const call = await this.findById(data.callId);
    if (call) {
      const imageUrls = [...(call.imageUrls || []), data.path];
      await getPool().query(
        'UPDATE calls SET image_urls = $2::jsonb, updated_at = $3 WHERE id = $1',
        [data.callId, JSON.stringify(imageUrls), now]
      );
    }

    return {
      id,
      filename: data.filename,
      path: data.path,
      callId: data.callId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get images for a call.
   */
  static async getCallImages(callId: string): Promise<CallImage[]> {
    const result = await getPool().query(
      'SELECT * FROM call_images WHERE call_id = $1 ORDER BY created_at ASC',
      [callId]
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      filename: String(row.filename),
      path: String(row.path),
      callId: String(row.call_id),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    }));
  }

  /**
   * Delete image.
   */
  static async deleteImage(imageId: string): Promise<CallImage | null> {
    const result = await getPool().query('SELECT * FROM call_images WHERE id = $1', [imageId]);
    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    const image: CallImage = {
      id: String(row.id),
      filename: String(row.filename),
      path: String(row.path),
      callId: String(row.call_id),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };

    await getPool().query('DELETE FROM call_images WHERE id = $1', [imageId]);

    const call = await this.findById(image.callId);
    if (call) {
      const imageUrls = (call.imageUrls || []).filter((url) => url !== image.path);
      await getPool().query(
        'UPDATE calls SET image_urls = $2::jsonb, updated_at = $3 WHERE id = $1',
        [image.callId, JSON.stringify(imageUrls), new Date()]
      );
    }

    return image;
  }

  /**
   * Find image by ID.
   */
  static async findImageById(imageId: string): Promise<CallImage | null> {
    const result = await getPool().query('SELECT * FROM call_images WHERE id = $1', [imageId]);
    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      filename: String(row.filename),
      path: String(row.path),
      callId: String(row.call_id),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }

  /**
   * Get total count.
   */
  static async getCount(): Promise<number> {
    const result = await getPool().query('SELECT COUNT(*)::int AS count FROM calls');
    return result.rows[0].count;
  }

  /**
   * Increment message count and update last activity.
   */
  static async incrementMessageCount(callId: string, messagePreview?: string): Promise<void> {
    const now = new Date();
    const preview = messagePreview ? messagePreview.substring(0, 100) : null;

    if (preview) {
      await getPool().query(
        `UPDATE calls
         SET message_count = message_count + 1,
             last_activity_at = $2,
             last_message_preview = $3,
             updated_at = $2
         WHERE id = $1`,
        [callId, now, preview]
      );
      return;
    }

    await getPool().query(
      `UPDATE calls
       SET message_count = message_count + 1,
           last_activity_at = $2,
           updated_at = $2
       WHERE id = $1`,
      [callId, now]
    );
  }

  /**
   * Decrement message count.
   */
  static async decrementMessageCount(callId: string): Promise<void> {
    await getPool().query(
      `UPDATE calls
       SET message_count = GREATEST(0, message_count - 1),
           updated_at = $2
       WHERE id = $1`,
      [callId, new Date()]
    );
  }

  /**
   * Increment attachment count.
   */
  static async incrementAttachmentCount(callId: string): Promise<void> {
    const now = new Date();
    await getPool().query(
      `UPDATE calls
       SET attachment_count = attachment_count + 1,
           last_activity_at = $2,
           updated_at = $2
       WHERE id = $1`,
      [callId, now]
    );
  }

  /**
   * Decrement attachment count.
   */
  static async decrementAttachmentCount(callId: string): Promise<void> {
    await getPool().query(
      `UPDATE calls
       SET attachment_count = GREATEST(0, attachment_count - 1),
           updated_at = $2
       WHERE id = $1`,
      [callId, new Date()]
    );
  }

  /**
   * Update last activity timestamp.
   */
  static async updateLastActivity(callId: string, messagePreview?: string): Promise<void> {
    const now = new Date();
    const preview = messagePreview ? messagePreview.substring(0, 100) : null;

    if (preview) {
      await getPool().query(
        `UPDATE calls
         SET last_activity_at = $2,
             last_message_preview = $3,
             updated_at = $2
         WHERE id = $1`,
        [callId, now, preview]
      );
      return;
    }

    await getPool().query(
      'UPDATE calls SET last_activity_at = $2, updated_at = $2 WHERE id = $1',
      [callId, now]
    );
  }

  /**
   * Find call by ID with all related data.
   */
  static async findByIdWithDetails(id: string): Promise<(Call & {
    images: CallImage[];
    messages: CallMessage[];
    attachments: CallAttachment[];
    history: CallHistoryEntry[];
  }) | null> {
    const call = await this.findById(id);
    if (!call) {
      return null;
    }

    const [images, messages, attachments, history] = await Promise.all([
      this.getCallImages(id),
      CallMessageRepository.findByCallId(id),
      CallAttachmentRepository.findByCallId(id),
      CallHistoryRepository.findByCallId(id),
    ]);

    return { ...call, images, messages, attachments, history };
  }

  private static rowToCall(row: Record<string, unknown>): Call {
    return {
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      status: String(row.status),
      priority: String(row.priority),
      userId: String(row.user_id),
      userName: row.user_name ? String(row.user_name) : undefined,
      userEmail: row.user_email ? String(row.user_email) : undefined,
      userPhone: row.user_phone ? String(row.user_phone) : undefined,
      chamadoLocalId: row.chamado_local_id ? String(row.chamado_local_id) : undefined,
      chamadoLocalName: row.chamado_local_name ? String(row.chamado_local_name) : undefined,
      departamentoId: row.departamento_id ? String(row.departamento_id) : undefined,
      departamentoName: row.departamento_name ? String(row.departamento_name) : undefined,
      imageUrls: parseImageUrls(row.image_urls),
      messageCount: Number(row.message_count ?? 0),
      attachmentCount: Number(row.attachment_count ?? 0),
      lastActivityAt: toDate(row.last_activity_at ?? row.updated_at),
      lastMessagePreview: row.last_message_preview ? String(row.last_message_preview) : undefined,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }
}
