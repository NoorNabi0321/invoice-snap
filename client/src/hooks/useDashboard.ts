import { useState, useEffect } from 'react';
import type { DashboardStats, ChartDataPoint, Invoice } from '../types';
import { dashboardService } from '../services/dashboard.service';
import { invoiceService } from '../services/invoice.service';

interface DashboardData {
  stats: DashboardStats | null;
  chart: ChartDataPoint[];
  recentInvoices: Invoice[];
  loading: boolean;
  error: string | null;
}

export function useDashboard(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<ChartDataPoint[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsData, chartData, invoicesData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getChart(12),
          invoiceService.getAll(),
        ]);
        if (cancelled) return;
        setStats(statsData);
        setChart(chartData);
        setRecentInvoices(invoicesData.slice(0, 5));
      } catch {
        if (!cancelled) setError('Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return { stats, chart, recentInvoices, loading, error };
}
