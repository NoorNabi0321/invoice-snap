import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { AppError } from '../types';
import * as invoiceModel from '../models/invoice.model';
import type { ItemInput, InvoiceInput } from '../models/invoice.model';
import * as userModel from '../models/user.model';
import { generateInvoicePdf } from '../utils/pdfGenerator';

type RawItem = { description: string; quantity: unknown; rate: unknown; sort_order?: unknown };

function parseItems(raw: RawItem[]): ItemInput[] {
  return raw.map((item, i) => ({
    description: String(item.description),
    quantity: Number(item.quantity),
    rate: Math.round(Number(item.rate)),
    sort_order: item.sort_order !== undefined ? Number(item.sort_order) : i,
  }));
}

function parseInput(body: Record<string, unknown>): InvoiceInput {
  return {
    client_id: body['client_id'] as string,
    issue_date: body['issue_date'] as string,
    due_date: body['due_date'] as string,
    tax_rate: Number(body['tax_rate'] ?? 0),
    discount_amount: Math.round(Number(body['discount_amount'] ?? 0)),
    notes: (body['notes'] as string | undefined) ?? null,
    status: (body['status'] as string | undefined),
    items: parseItems((body['items'] as RawItem[]) ?? []),
  };
}

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, from, to } = req.query as Record<string, string | undefined>;
    const invoices = await invoiceModel.findAll(req.user!.userId, { status, from, to });
    res.json({ data: invoices });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceModel.create(req.user!.userId, parseInput(req.body as Record<string, unknown>));
    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceModel.findById(req.params['id'] as string, req.user!.userId);
    if (!invoice) throw new AppError('Invoice not found', 404);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body['client_id'] || !body['issue_date'] || !body['due_date'] ||
        !Array.isArray(body['items']) || (body['items'] as unknown[]).length === 0) {
      res.status(400).json({ error: 'client_id, issue_date, due_date, and items are required' });
      return;
    }
    const invoice = await invoiceModel.update(req.params['id'] as string, req.user!.userId, parseInput(body));
    if (!invoice) throw new AppError('Invoice not found', 404);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await invoiceModel.remove(req.params['id'] as string, req.user!.userId);
    if (!deleted) throw new AppError('Invoice not found', 404);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as { status?: string };
    const valid = ['draft', 'sent', 'paid', 'overdue'] as const;
    if (!status || !(valid as readonly string[]).includes(status)) {
      res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
      return;
    }
    const invoice = await invoiceModel.updateStatus(req.params['id'] as string, req.user!.userId, status);
    if (!invoice) throw new AppError('Invoice not found', 404);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceModel.findById(req.params['id'] as string, req.user!.userId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const user = await userModel.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);

    const pdfBuffer = await generateInvoicePdf(invoice, user);

    const filename = `invoice-${invoice.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
