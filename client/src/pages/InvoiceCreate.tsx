import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, AlertCircle, Copy, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { LineItemRow } from '../components/invoice/LineItemRow';
import type { LineItem, LineItemError } from '../components/invoice/LineItemRow';
import { InvoiceTotals } from '../components/invoice/InvoiceTotals';
import { useInvoice, useInvoiceMutations } from '../hooks/useInvoices';
import { useClients } from '../hooks/useClients';
import type { Invoice, InvoiceStatus } from '../types';

const DRAFT_KEY = 'invoice_snap_new_draft';

function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const EMPTY_ITEM = (): LineItem => ({
  id: generateTempId(),
  description: '',
  quantity: 1,
  rate: 0,
});

function itemsFromTemplate(template: Invoice): LineItem[] {
  if (!template.items?.length) return [EMPTY_ITEM()];
  return template.items.map((i) => ({
    id: generateTempId(),
    description: i.description,
    quantity: i.quantity,
    rate: i.rate,
  }));
}

interface FormErrors {
  clientId?: string;
  issueDate?: string;
  dueDate?: string;
}

const fieldCls = (hasError?: boolean) =>
  cn(
    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors',
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary focus:ring-primary'
  );

export default function InvoiceCreate() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const template = (location.state as { template?: Invoice } | null)?.template;

  const { clients, isLoading: clientsLoading } = useClients();
  const { invoice, loading: invoiceLoading } = useInvoice(id);
  const { saving, createInvoice, updateInvoice } = useInvoiceMutations();

  const today = new Date().toISOString().split('T')[0]!;

  // State — initialised from template when duplicating
  const [clientId, setClientId] = useState(() => (!isEditing && template) ? template.client_id : '');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [taxRate, setTaxRate] = useState(() => (!isEditing && template) ? template.tax_rate : 0);
  const [discountAmount, setDiscountAmount] = useState(() => (!isEditing && template) ? template.discount_amount : 0);
  const [notes, setNotes] = useState(() => (!isEditing && template) ? (template.notes ?? '') : '');
  const [items, setItems] = useState<LineItem[]>(() =>
    (!isEditing && template) ? itemsFromTemplate(template) : [EMPTY_ITEM()]
  );

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [itemErrors, setItemErrors] = useState<Record<number, LineItemError>>({});

  // Autosave refs
  const mountedRef = useRef(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form ref for Ctrl+S
  const formRef = useRef<HTMLFormElement>(null);

  // Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Default due date (+30 days) for new invoices
  useEffect(() => {
    if (!isEditing && !dueDate) {
      const due = new Date(issueDate);
      due.setDate(due.getDate() + 30);
      setDueDate(due.toISOString().split('T')[0]!);
    }
  }, [issueDate, isEditing, dueDate]);

  // Load draft from localStorage on mount (only for new invoices without a template)
  useEffect(() => {
    if (!isEditing && !template) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as Record<string, unknown>;
          if (d['clientId']) setClientId(d['clientId'] as string);
          if (d['issueDate']) setIssueDate(d['issueDate'] as string);
          if (d['dueDate']) setDueDate(d['dueDate'] as string);
          if (d['status']) setStatus(d['status'] as InvoiceStatus);
          if (typeof d['taxRate'] === 'number') setTaxRate(d['taxRate']);
          if (typeof d['discountAmount'] === 'number') setDiscountAmount(d['discountAmount']);
          if (d['notes']) setNotes(d['notes'] as string);
          if (Array.isArray(d['items']) && (d['items'] as unknown[]).length) setItems(d['items'] as LineItem[]);
        }
      } catch { /* corrupt draft — ignore */ }
    }
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // Populate form when editing an existing invoice
  useEffect(() => {
    if (isEditing && invoice) {
      setClientId(invoice.client_id);
      const toDateStr = (v: string | Date) =>
        typeof v === 'string' ? v.split('T')[0]! : new Date(v).toISOString().split('T')[0]!;
      setIssueDate(toDateStr(invoice.issue_date));
      setDueDate(toDateStr(invoice.due_date));
      setStatus(invoice.status);
      setTaxRate(invoice.tax_rate);
      setDiscountAmount(invoice.discount_amount);
      setNotes(invoice.notes ?? '');
      if (invoice.items?.length) {
        setItems(invoice.items.map((item) => ({
          id: item.id || generateTempId(),
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
        })));
      }
    }
  }, [isEditing, invoice]);

  // Autosave draft with 800 ms debounce (new invoices only)
  useEffect(() => {
    if (!mountedRef.current || isEditing) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const hasContent = Boolean(
        clientId || notes.trim() || items.some((i) => i.description.trim() || i.rate > 0)
      );
      if (hasContent) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ clientId, issueDate, dueDate, status, taxRate, discountAmount, notes, items })
        );
        setDraftSaved(true);
        if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
        draftSavedTimerRef.current = setTimeout(() => setDraftSaved(false), 2500);
      }
    }, 800);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [clientId, issueDate, dueDate, status, taxRate, discountAmount, notes, items, isEditing]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [items]
  );

  const clearFieldError = (field: keyof FormErrors) => {
    if (formErrors[field]) setFormErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleItemChange = (itemId: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx !== -1 && itemErrors[idx]?.[field as keyof LineItemError]) {
      setItemErrors((prev) => {
        const updated = { ...prev[idx] };
        delete updated[field as keyof LineItemError];
        return { ...prev, [idx]: updated };
      });
    }
  };

  const handleAddItem = () => setItems((prev) => [...prev, EMPTY_ITEM()]);

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const validate = (): boolean => {
    const fe: FormErrors = {};
    const ie: Record<number, LineItemError> = {};
    let valid = true;

    if (!clientId) { fe.clientId = 'Please select a client'; valid = false; }
    if (!issueDate) { fe.issueDate = 'Issue date is required'; valid = false; }
    if (!dueDate) {
      fe.dueDate = 'Due date is required'; valid = false;
    } else if (issueDate && dueDate < issueDate) {
      fe.dueDate = 'Due date must be on or after the issue date'; valid = false;
    }

    items.forEach((item, i) => {
      const e: LineItemError = {};
      if (!item.description.trim()) { e.description = 'Description is required'; valid = false; }
      if (item.quantity <= 0) { e.quantity = 'Must be > 0'; valid = false; }
      if (Object.keys(e).length) ie[i] = e;
    });

    setFormErrors(fe);
    setItemErrors(ie);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      client_id: clientId,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      tax_rate: taxRate,
      discount_amount: discountAmount,
      notes: notes || undefined,
      items: items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        sort_order: index,
      })),
    };

    const result = isEditing && id
      ? await updateInvoice(id, payload)
      : await createInvoice(payload);

    if (result) {
      if (!isEditing) localStorage.removeItem(DRAFT_KEY);
      navigate(`/invoices/${result.id}`);
    }
  };

  const hasErrors = Object.keys(formErrors).some((k) => !!formErrors[k as keyof FormErrors]);

  if ((isEditing && invoiceLoading) || clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Invoice' : template ? 'Duplicate Invoice' : 'Create Invoice'}
        </h1>
        <p className="text-muted mt-1">
          {isEditing
            ? 'Update invoice details and line items.'
            : template
            ? `Pre-filled from ${template.invoice_number}. Adjust and save as a new invoice.`
            : 'Fill in the details to create a new invoice.'}
        </p>
      </div>

      {/* Duplicate banner */}
      {!isEditing && template && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5 text-sm text-blue-700">
          <Copy className="w-4 h-4 flex-shrink-0" />
          Duplicated from <strong>{template.invoice_number}</strong>. Issue &amp; due dates are reset — update them before saving.
        </div>
      )}

      {/* Error banner */}
      {hasErrors && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Please fix the errors below before saving.</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Header Fields */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Client */}
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1.5">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                id="client"
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); clearFieldError('clientId'); }}
                className={fieldCls(!!formErrors.clientId)}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
              {formErrors.clientId && (
                <p className="text-xs text-red-500 mt-1">{formErrors.clientId}</p>
              )}
              {clients.length === 0 && (
                <p className="text-xs text-muted mt-1">
                  No clients yet.{' '}
                  <a href="/clients" className="text-primary hover:underline">Add one first →</a>
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className={fieldCls()}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Issue Date */}
            <div>
              <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); clearFieldError('issueDate'); }}
                className={fieldCls(!!formErrors.issueDate)}
              />
              {formErrors.issueDate && (
                <p className="text-xs text-red-500 mt-1">{formErrors.issueDate}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                min={issueDate}
                onChange={(e) => { setDueDate(e.target.value); clearFieldError('dueDate'); }}
                className={fieldCls(!!formErrors.dueDate)}
              />
              {formErrors.dueDate && (
                <p className="text-xs text-red-500 mt-1">{formErrors.dueDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Line Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-2 text-left text-xs font-medium text-muted uppercase w-8">#</th>
                  <th className="py-2 pr-2 text-left text-xs font-medium text-muted uppercase">Description</th>
                  <th className="py-2 pr-2 text-left text-xs font-medium text-muted uppercase w-20">Qty</th>
                  <th className="py-2 pr-2 text-left text-xs font-medium text-muted uppercase w-28">Rate ($)</th>
                  <th className="py-2 pr-2 text-right text-xs font-medium text-muted uppercase w-28">Amount</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={handleItemChange}
                    onRemove={handleRemoveItem}
                    disabled={saving}
                    error={itemErrors[index]}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <InvoiceTotals
            subtotal={subtotal}
            taxRate={taxRate}
            discountAmount={discountAmount}
            onTaxRateChange={setTaxRate}
            onDiscountChange={setDiscountAmount}
            editable
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes / Terms
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, thank you message, etc."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/invoices')}
            disabled={saving}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            {!isEditing && draftSaved && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <Check className="w-3 h-3" />
                Draft saved
              </span>
            )}

            <Button type="submit" isLoading={saving}>
              {isEditing ? 'Update Invoice' : 'Create Invoice'}
              {!saving && (
                <kbd className="ml-2 hidden sm:inline-block text-[10px] font-normal opacity-60 bg-white/20 border border-white/30 rounded px-1 py-0.5">
                  ⌘S
                </kbd>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
