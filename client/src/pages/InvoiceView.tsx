import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Download, Printer, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { InvoiceTotals } from '../components/invoice/InvoiceTotals';
import { useInvoice, useInvoiceMutations } from '../hooks/useInvoices';
import { invoiceService } from '../services/invoice.service';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import type { InvoiceStatus } from '../types';

const NEXT_STATUS: Partial<Record<InvoiceStatus, { label: string; value: InvoiceStatus }>> = {
  draft: { label: 'Mark as Sent', value: 'sent' },
  sent: { label: 'Mark as Paid', value: 'paid' },
  overdue: { label: 'Mark as Paid', value: 'paid' },
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoice, loading, error, refetch } = useInvoice(id);
  const { updateStatus, deleteInvoice } = useInvoiceMutations();

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!id) return;
    setUpdatingStatus(true);
    const success = await updateStatus(id, newStatus);
    setUpdatingStatus(false);
    if (success) refetch();
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const success = await deleteInvoice(id);
    setDeleting(false);
    if (success) navigate('/invoices');
  };

  const handleDownloadPdf = () => {
    window.open(invoiceService.getPdfUrl(id!), '_blank');
  };

  const handleDuplicate = () => {
    navigate('/invoices/new', { state: { template: invoice } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-4">{error || 'Invoice not found'}</p>
        <Link to="/invoices">
          <Button variant="secondary">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[invoice.status];
  const bizName = user?.business_name || user?.email || 'My Business';
  const bizEmail = user?.business_email || user?.email || '';

  return (
    <div className="max-w-4xl mx-auto">

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>

        <div className="flex items-center gap-2">
          {nextStatus && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange(nextStatus.value)}
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Updating…' : nextStatus.label}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-1.5" />
            Duplicate
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-1.5" />
            PDF
          </Button>
          <Link to={`/invoices/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">

        {/* Top: Business brand + Invoice meta */}
        <div className="flex justify-between items-start pb-8 border-b border-gray-100">
          <div>
            <p className="text-xl font-bold text-gray-900">{bizName}</p>
            {bizEmail && <p className="text-sm text-muted mt-0.5">{bizEmail}</p>}
            {user?.business_phone && <p className="text-sm text-muted">{user.business_phone}</p>}
            {user?.business_address && <p className="text-sm text-muted">{user.business_address}</p>}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight text-gray-800">INVOICE</p>
            <p className="text-base font-semibold text-primary mt-1">{invoice.invoice_number}</p>
            <div className="mt-2">
              <Badge status={invoice.status} />
            </div>
            <div className="mt-3 space-y-0.5 text-sm text-muted">
              <p><span className="font-medium text-gray-700">Issued:</span> {formatDate(invoice.issue_date)}</p>
              <p><span className="font-medium text-gray-700">Due:</span> {formatDate(invoice.due_date)}</p>
            </div>
          </div>
        </div>

        {/* From / Bill To */}
        <div className="grid grid-cols-2 gap-8 py-8 border-b border-gray-100">
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">From</h3>
            <p className="font-medium text-gray-900">{bizName}</p>
            {bizEmail && <p className="text-sm text-muted">{bizEmail}</p>}
            {user?.business_phone && <p className="text-sm text-muted">{user.business_phone}</p>}
            {user?.business_address && <p className="text-sm text-muted">{user.business_address}</p>}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Bill To</h3>
            <p className="font-medium text-gray-900">{invoice.client_name || '—'}</p>
            {invoice.client_email && <p className="text-sm text-muted">{invoice.client_email}</p>}
            {invoice.client_phone && <p className="text-sm text-muted">{invoice.client_phone}</p>}
            {invoice.client_address && <p className="text-sm text-muted">{invoice.client_address}</p>}
            {(invoice.client_city || invoice.client_country) && (
              <p className="text-sm text-muted">
                {[invoice.client_city, invoice.client_country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="py-8 border-b border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-8">#</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Description</th>
                <th className="pb-3 text-right text-xs font-semibold text-muted uppercase tracking-wider w-16">Qty</th>
                <th className="pb-3 text-right text-xs font-semibold text-muted uppercase tracking-wider w-28">Rate</th>
                <th className="pb-3 text-right text-xs font-semibold text-muted uppercase tracking-wider w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-sm text-muted">{index + 1}</td>
                    <td className="py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="py-3 text-sm text-right text-gray-700">{item.quantity}</td>
                    <td className="py-3 text-sm text-right text-gray-700">{formatCurrency(item.rate)}</td>
                    <td className="py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.rate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted">No line items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="pt-6">
          <InvoiceTotals
            subtotal={invoice.subtotal}
            taxRate={invoice.tax_rate}
            discountAmount={invoice.discount_amount}
          />
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes / Terms</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Invoice"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete invoice <strong>{invoice.invoice_number}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
