import { PaginationOptions } from '../types/models';

const ORDER_BY_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  name: 'name',
  title: 'title',
  status: 'status',
  priority: 'priority',
  lastActivityAt: 'last_activity_at',
};

/**
 * Map API orderBy field to a safe SQL column name.
 */
export function resolveOrderColumn(orderBy = 'createdAt'): string {
  return ORDER_BY_COLUMNS[orderBy] ?? 'created_at';
}

/**
 * Build OFFSET/LIMIT pagination values.
 */
export function getPagination(options: PaginationOptions = {}): {
  page: number;
  limit: number;
  offset: number;
  orderBy: string;
  orderDirection: 'ASC' | 'DESC';
} {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, options.limit ?? 10);
  const orderBy = resolveOrderColumn(options.orderBy);
  const orderDirection = options.orderDirection === 'asc' ? 'ASC' : 'DESC';

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    orderBy,
    orderDirection,
  };
}

/**
 * Parse a database timestamp into a Date.
 */
export function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

/**
 * Parse JSONB image URL arrays from PostgreSQL.
 */
export function parseImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
