import { pool } from '../config/db';

export interface DashboardStats {
  total_revenue: number;
  total_pending: number;
  overdue_count: number;
  total_clients: number;
  total_invoices: number;
  invoices_this_month: number;
}

export interface ChartPoint {
  month: string;  // 'YYYY-MM'
  revenue: number; // cents
}

export async function getStats(userId: string): Promise<DashboardStats> {
  const { rows } = await pool.query<DashboardStats>(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'paid'               THEN total ELSE 0 END), 0)::INTEGER AS total_revenue,
       COALESCE(SUM(CASE WHEN status IN ('sent', 'draft')   THEN total ELSE 0 END), 0)::INTEGER AS total_pending,
       COUNT(CASE WHEN status = 'overdue'                   THEN 1 END)::INTEGER                AS overdue_count,
       COUNT(*)::INTEGER                                                                         AS total_invoices,
       COUNT(CASE WHEN DATE_TRUNC('month', issue_date) = DATE_TRUNC('month', CURRENT_DATE)
                  THEN 1 END)::INTEGER                                                           AS invoices_this_month,
       (SELECT COUNT(*)::INTEGER FROM clients WHERE user_id = $1)                               AS total_clients
     FROM invoices
     WHERE user_id = $1`,
    [userId],
  );
  return rows[0]!;
}

export async function getChart(userId: string, months = 12): Promise<ChartPoint[]> {
  const { rows } = await pool.query<ChartPoint>(
    `SELECT
       TO_CHAR(m.month, 'YYYY-MM')         AS month,
       COALESCE(SUM(i.total), 0)::INTEGER  AS revenue
     FROM generate_series(
       DATE_TRUNC('month', CURRENT_DATE - (($2 - 1) || ' months')::INTERVAL),
       DATE_TRUNC('month', CURRENT_DATE),
       '1 month'
     ) AS m(month)
     LEFT JOIN invoices i
       ON DATE_TRUNC('month', i.issue_date) = m.month
      AND i.user_id = $1
      AND i.status = 'paid'
     GROUP BY m.month
     ORDER BY m.month`,
    [userId, months],
  );
  return rows;
}
