import api from './api';
import type { Invoice, InvoiceStatus } from '../types';

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  rate: number; // cents
  sort_order: number;
}

export interface CreateInvoicePayload {
  client_id: string;
  issue_date: string;
  due_date: string;
  tax_rate: number;
  discount_amount: number; // cents
  notes?: string;
  status: InvoiceStatus;
  items: InvoiceItemPayload[];
}

export type UpdateInvoicePayload = CreateInvoicePayload;

export const invoiceService = {
  async getAll(status?: InvoiceStatus): Promise<Invoice[]> {
    const params = status ? { status } : {};
    const { data } = await api.get('/invoices', { params });
    return data.data;
  },

  async getById(id: string): Promise<Invoice> {
    const { data } = await api.get(`/invoices/${id}`);
    return data.data;
  },

  async create(payload: CreateInvoicePayload): Promise<Invoice> {
    const { data } = await api.post('/invoices', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateInvoicePayload): Promise<Invoice> {
    const { data } = await api.put(`/invoices/${id}`, payload);
    return data.data;
  },

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const { data } = await api.patch(`/invoices/${id}/status`, { status });
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/invoices/${id}`);
  },

  getPdfUrl(id: string): string {
    const base = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('token') ?? '';
    return `${base}/invoices/${id}/pdf?token=${encodeURIComponent(token)}`;
  },
};
