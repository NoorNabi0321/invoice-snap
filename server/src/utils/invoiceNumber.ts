import type { PoolClient } from 'pg';

export async function nextInvoiceNumber(client: PoolClient, userId: string): Promise<string> {
  const { rows } = await client.query<{ max_num: number }>(
    `SELECT COALESCE(
       MAX(CAST(REGEXP_REPLACE(invoice_number, 'INV-', '') AS INTEGER)),
       0
     ) AS max_num
     FROM invoices
     WHERE user_id = $1`,
    [userId]
  );
  const next = (rows[0]?.max_num ?? 0) + 1;
  return `INV-${String(next).padStart(4, '0')}`;
}
