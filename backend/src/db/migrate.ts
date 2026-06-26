import fs from 'fs';
import path from 'path';
import { getPool } from '../lib/db';

/**
 * Resolve schema.sql path for dev (ts) and production (dist) builds.
 */
function getSchemaPath(): string {
  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.join(__dirname, '..', 'db', 'schema.sql'),
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),
    path.join(process.cwd(), 'dist', 'db', 'schema.sql'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('schema.sql not found');
}

/**
 * Apply database schema (idempotent).
 */
export async function migrate(): Promise<void> {
  const schemaPath = getSchemaPath();
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const pool = getPool();

  await pool.query(sql);
  console.log('✅ PostgreSQL schema applied');
}
