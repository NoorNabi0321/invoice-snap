import { Request } from 'express';

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  business_name: string | null;
  business_email: string | null;
  business_address: string | null;
  business_phone: string | null;
  logo_url: string | null;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceRow {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issue_date: string | Date;
  due_date: string | Date;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
