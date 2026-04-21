import { pool } from '../config/db';
import { ClientRow } from '../types';

export async function findAll(userId: string, search?: string): Promise<ClientRow[]> {
  if (search) {
    const { rows } = await pool.query<ClientRow>(
      `SELECT c.*,
              COUNT(i.id)::int AS invoice_count
         FROM clients c
         LEFT JOIN invoices i ON i.client_id = c.id
        WHERE c.user_id = $1
          AND (c.name ILIKE $2 OR c.email ILIKE $2)
        GROUP BY c.id
        ORDER BY c.name ASC`,
      [userId, `%${search}%`]
    );
    return rows;
  }

  const { rows } = await pool.query<ClientRow>(
    `SELECT c.*,
            COUNT(i.id)::int AS invoice_count
       FROM clients c
       LEFT JOIN invoices i ON i.client_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.name ASC`,
    [userId]
  );
  return rows;
}

export async function findById(id: string, userId: string): Promise<ClientRow | null> {
  const { rows } = await pool.query<ClientRow>(
    `SELECT c.*,
            COUNT(i.id)::int AS invoice_count
       FROM clients c
       LEFT JOIN invoices i ON i.client_id = c.id
      WHERE c.id = $1 AND c.user_id = $2
      GROUP BY c.id`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function create(data: {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}): Promise<ClientRow> {
  const { rows } = await pool.query<ClientRow>(
    `INSERT INTO clients (user_id, name, email, phone, address, city, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.user_id,
      data.name,
      data.email,
      data.phone ?? null,
      data.address ?? null,
      data.city ?? null,
      data.country ?? null,
    ]
  );
  return rows[0]!;
}

export async function update(
  id: string,
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  }
): Promise<ClientRow | null> {
  const { rows } = await pool.query<ClientRow>(
    `UPDATE clients
        SET name    = COALESCE($3, name),
            email   = COALESCE($4, email),
            phone   = COALESCE($5, phone),
            address = COALESCE($6, address),
            city    = COALESCE($7, city),
            country = COALESCE($8, country)
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [
      id,
      userId,
      data.name ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.city ?? null,
      data.country ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function remove(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM clients WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}
