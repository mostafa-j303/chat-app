// lib/db.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

export function connectToDatabase() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Render requires SSL
    });
  }

  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database connection not established.');
  }
  return pool;
}

export async function closeDatabaseConnection() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Optional: Immediately connect
export const poolPromise = connectToDatabase();
