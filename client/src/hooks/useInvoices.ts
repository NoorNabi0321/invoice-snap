import { useState, useEffect, useCallback } from 'react';
import { invoiceService } from '../services/invoice.service';
import type { CreateInvoicePayload, UpdateInvoicePayload } from '../services/invoice.service';
import type { Invoice, InvoiceStatus } from '../types';
import toast from 'react-hot-toast';

export function useInvoices(statusFilter?: InvoiceStatus) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getAll(statusFilter);
      setInvoices(data);
    } catch (err) {
      setError('Failed to load invoices');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, loading, error, refetch: fetchInvoices };
}

export function useInvoice(id: string | undefined) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await invoiceService.getById(id);
        if (!cancelled) setInvoice(data);
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load invoice');
          toast.error('Failed to load invoice');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [id, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { invoice, loading, error, refetch };
}

export function useInvoiceMutations() {
  const [saving, setSaving] = useState(false);

  const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice | null> => {
    try {
      setSaving(true);
      const invoice = await invoiceService.create(payload);
      toast.success('Invoice created');
      return invoice;
    } catch (err) {
      toast.error('Failed to create invoice');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateInvoice = async (id: string, payload: UpdateInvoicePayload): Promise<Invoice | null> => {
    try {
      setSaving(true);
      const invoice = await invoiceService.update(id, payload);
      toast.success('Invoice updated');
      return invoice;
    } catch (err) {
      toast.error('Failed to update invoice');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: InvoiceStatus): Promise<boolean> => {
    try {
      await invoiceService.updateStatus(id, status);
      toast.success(`Invoice marked as ${status}`);
      return true;
    } catch (err) {
      toast.error('Failed to update status');
      return false;
    }
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    try {
      await invoiceService.remove(id);
      toast.success('Invoice deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete invoice');
      return false;
    }
  };

  return { saving, createInvoice, updateInvoice, updateStatus, deleteInvoice };
}
