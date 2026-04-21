import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, FileText, Search, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { useInvoices, useInvoiceMutations } from '../hooks/useInvoices';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import type { InvoiceStatus } from '../types';
import { cn } from '../utils/cn';

const STATUS_TABS: { label: string; value: InvoiceStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
];

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-20 hidden sm:block" />
            <Skeleton className="h-4 w-20 hidden sm:block" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Invoices() {
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const { invoices, loading, refetch } = useInvoices(activeStatus);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.client_name ?? '').toLowerCase().includes(q) ||
        String(inv.total / 100).includes(q)
    );
  }, [invoices, search]);
  const { deleteInvoice } = useInvoiceMutations();
  const navigate = useNavigate();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const success = await deleteInvoice(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (success) refetch();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-muted mt-1 hidden sm:block">Manage and track all your invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-44 sm:w-52 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Link to="/invoices/new">
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveStatus(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
              activeStatus === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <TableSkeleton />
      ) : filteredInvoices.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mx-auto mb-4">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {search ? 'No results found' : activeStatus ? `No ${activeStatus} invoices` : 'No invoices yet'}
          </h3>
          <p className="text-sm text-muted mb-5">
            {search
              ? `No invoices match "${search}". Try a different search.`
              : activeStatus
              ? `You don't have any ${activeStatus} invoices at the moment.`
              : 'Create your first invoice to start getting paid.'}
          </p>
          <Link to="/invoices/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Invoice
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Due</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <Link to={`/invoices/${inv.id}`} className="hover:text-primary">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate">
                        {inv.client_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted hidden md:table-cell">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted hidden md:table-cell">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge status={inv.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                            className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(inv.id)}
                            className="p-1.5 text-gray-400 hover:text-danger rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-primary"
                    >
                      {inv.invoice_number}
                    </Link>
                    <p className="text-xs text-muted mt-0.5 truncate">{inv.client_name || '—'}</p>
                    <p className="text-xs text-muted mt-0.5">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                    <div className="mt-1">
                      <Badge status={inv.status} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link to={`/invoices/${inv.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Link to={`/invoices/${inv.id}/edit`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <button
                    onClick={() => setDeleteId(inv.id)}
                    className="p-2 text-gray-400 hover:text-danger rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Invoice"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete this invoice? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
