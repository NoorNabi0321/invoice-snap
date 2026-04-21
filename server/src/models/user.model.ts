import { pool } from '../config/db';
import { UserRow } from '../types';

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

export async function create(data: {
  email: string;
  password_hash: string;
  business_name?: string;
}): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, business_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.email, data.password_hash, data.business_name ?? null]
  );
  return rows[0]!;
}

export async function updateProfile(
  id: string,
  data: {
    business_name?: string;
    business_email?: string;
    business_address?: string;
    business_phone?: string;
    currency?: string;
  }
): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users
     SET business_name    = COALESCE($2, business_name),
         business_email   = COALESCE($3, business_email),
         business_address = COALESCE($4, business_address),
         business_phone   = COALESCE($5, business_phone),
         currency         = COALESCE($6, currency)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.business_name ?? null,
      data.business_email ?? null,
      data.business_address ?? null,
      data.business_phone ?? null,
      data.currency ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function updateLogoUrl(id: string, logo_url: string): Promise<void> {
  await pool.query('UPDATE users SET logo_url = $2 WHERE id = $1', [id, logo_url]);
}
