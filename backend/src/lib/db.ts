import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Initialize PostgreSQL connection pool.
 */
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
  });

  console.log('🐘 PostgreSQL pool initialized');
  return pool;
}

/**
 * Get the shared PostgreSQL pool.
 */
export function getPool(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

/**
 * Run a health check query against PostgreSQL.
 */
export async function checkDatabaseHealth(): Promise<void> {
  const db = getPool();
  await db.query('SELECT 1');
}

/**
 * Execute a callback inside a transaction.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
