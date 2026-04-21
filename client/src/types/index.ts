export type UUID = string;

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface User {
  id: UUID;
  email: string;
  business_name: string | null;
  business_email: string | null;
  business_address: string | null;
  business_phone: string | null;
  logo_url: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: UUID;
  user_id: UUID;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: UUID;
  invoice_id: UUID;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface Invoice {
  id: UUID;
  user_id: UUID;
  client_id: UUID;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
  // Joined from clients table (always present on API responses)
  client_name?: string;
  client_email?: string;
  client_phone?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_country?: string | null;
}

export interface DashboardStats {
  total_revenue: number;
  total_pending: number;
  overdue_count: number;
  total_clients: number;
  total_invoices: number;
  invoices_this_month: number;
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  details?: string[];
}
