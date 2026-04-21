import { pool } from '../config/db';
import type { InvoiceRow, InvoiceItemRow } from '../types';
import { nextInvoiceNumber } from '../utils/invoiceNumber';

export interface InvoiceListRow extends InvoiceRow {
  client_name: string;
  client_email: string;
}

export interface InvoiceDetailRow extends InvoiceRow {
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_address: string | null;
  client_city: string | null;
  client_country: string | null;
  items: InvoiceItemRow[];
}

export interface ItemInput {
  description: string;
  quantity: number;
  rate: number;
  sort_order: number;
}

export interface InvoiceInput {
  client_id: string;
  issue_date: string;
  due_date: string;
  tax_rate: number;
  discount_amount: number; // cents, absolute value
  notes: string | null;
  status?: string;
  items: ItemInput[];
}

function calcTotals(items: ItemInput[], taxRate: number, discountAmount: number) {
  const subtotal = items.reduce((sum, it) => sum + Math.round(it.quantity * it.rate), 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  return { subtotal, taxAmount, discountAmount, total: subtotal + taxAmount - discountAmount };
}

export async function findAll(
  userId: string,
  filters: { status?: string; from?: string; to?: string }
): Promise<InvoiceListRow[]> {
  const params: unknown[] = [userId];
  let where = 'WHERE i.user_id = $1';

  if (filters.status) {
    params.push(filters.status);
    where += ` AND i.status = $${params.length}`;
  }
  if (filters.from) {
    params.push(filters.from);
    where += ` AND i.issue_date >= $${params.length}`;
  }
  if (filters.to) {
    params.push(filters.to);
    where += ` AND i.issue_date <= $${params.length}`;
  }

  const { rows } = await pool.query<InvoiceListRow>(
    `SELECT i.*, c.name AS client_name, c.email AS client_email
     FROM invoices i
     JOIN clients c ON c.id = i.client_id
     ${where}
     ORDER BY i.created_at DESC`,
    params
  );
  return rows;
}

export async function findById(id: string, userId: string): Promise<InvoiceDetailRow | null> {
  const { rows } = await pool.query<InvoiceRow & Omit<InvoiceDetailRow, keyof InvoiceRow | 'items'>>(
    `SELECT i.*,
            c.name    AS client_name,
            c.email   AS client_email,
            c.phone   AS client_phone,
            c.address AS client_address,
            c.city    AS client_city,
            c.country AS client_country
     FROM invoices i
     JOIN clients c ON c.id = i.client_id
     WHERE i.id = $1 AND i.user_id = $2`,
    [id, userId]
  );

  if (!rows[0]) return null;

  const { rows: items } = await pool.query<InvoiceItemRow>(
    'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
    [id]
  );

  return { ...rows[0]!, items };
}

export async function create(userId: string, data: InvoiceInput): Promise<InvoiceDetailRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceNumber = await nextInvoiceNumber(client, userId);
    const { subtotal, taxAmount, discountAmount, total } = calcTotals(
      data.items, data.tax_rate, data.discount_amount
    );

    const { rows } = await client.query<InvoiceRow>(
      `INSERT INTO invoices
         (user_id, client_id, invoice_number, status, issue_date, due_date,
          subtotal, tax_rate, tax_amount, discount_percent, discount_amount, total, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        userId, data.client_id, invoiceNumber,
        data.status ?? 'draft',
        data.issue_date, data.due_date,
        subtotal, data.tax_rate, taxAmount,
        0, discountAmount, total,
        data.notes,
      ]
    );

    const invoice = rows[0]!;

    for (const [i, item] of data.items.entries()) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [invoice.id, item.description, item.quantity, item.rate,
          Math.round(item.quantity * item.rate), item.sort_order ?? i]
      );
    }

    await client.query('COMMIT');

    const result = await findById(invoice.id, userId);
    return result!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(
  id: string,
  userId: string,
  data: InvoiceInput
): Promise<InvoiceDetailRow | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { subtotal, taxAmount, discountAmount, total } = calcTotals(
      data.items, data.tax_rate, data.discount_amount
    );

    const { rowCount } = await client.query(
      `UPDATE invoices
       SET client_id        = $3,
           status           = $4,
           issue_date       = $5,
           due_date         = $6,
           subtotal         = $7,
           tax_rate         = $8,
           tax_amount       = $9,
           discount_percent = $10,
           discount_amount  = $11,
           total            = $12,
           notes            = $13
       WHERE id = $1 AND user_id = $2`,
      [
        id, userId,
        data.client_id, data.status ?? 'draft',
        data.issue_date, data.due_date,
        subtotal, data.tax_rate, taxAmount,
        0, discountAmount, total,
        data.notes,
      ]
    );

    if (!rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

    for (const [i, item] of data.items.entries()) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, item.description, item.quantity, item.rate,
          Math.round(item.quantity * item.rate), item.sort_order ?? i]
      );
    }

    await client.query('COMMIT');
    return await findById(id, userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function remove(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM invoices WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateStatus(
  id: string,
  userId: string,
  status: string
): Promise<InvoiceRow | null> {
  const { rows } = await pool.query<InvoiceRow>(
    'UPDATE invoices SET status = $3 WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId, status]
  );
  return rows[0] ?? null;
}
