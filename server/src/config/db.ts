import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
  process.exit(1);
});

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('✓ Database connected');
  } finally {
    client.release();
  }
}
