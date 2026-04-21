import api from './api';
import type { DashboardStats, ChartDataPoint } from '../types';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get('/dashboard/stats');
    return data.data;
  },

  async getChart(months = 12): Promise<ChartDataPoint[]> {
    const { data } = await api.get('/dashboard/chart', { params: { months } });
    return data.data;
  },
};
