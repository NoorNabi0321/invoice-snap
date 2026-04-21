import { useState, useEffect, type FormEvent } from 'react';
import {
  Search, Plus, Pencil, Trash2, Users, Mail,
  Phone, MapPin, FileText, ChevronRight,
} from 'lucide-react';
import type { Client } from '../types';
import { useClients } from '../hooks/useClients';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { cn } from '../utils/cn';
import { useNavigate } from 'react-router-dom';

/* ── helpers ─────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
];
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/* ── empty state ─────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-4">
        <Users size={28} className="text-primary-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No clients yet</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">
        Add your first client to start creating invoices and tracking payments.
      </p>
      <Button onClick={onAdd} size="sm">
        <Plus size={15} /> Add your first client
      </Button>
    </div>
  );
}

/* ── client form ─────────────────────────────────────── */
interface ClientFormProps {
  initial?: Partial<Client>;
  onSubmit: (data: Partial<Client>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function ClientForm({ initial = {}, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    city: initial.city ?? '',
    country: initial.country ?? '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <Input
          label="Client / Company name *"
          placeholder="Acme Corp"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          autoFocus
        />
        <Input
          label="Email address *"
          type="email"
          placeholder="billing@acme.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+1 555 000 0000"
          value={form.phone}
          onChange={set('phone')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            placeholder="New York"
            value={form.city}
            onChange={set('city')}
          />
          <Input
            label="Country"
            placeholder="US"
            value={form.country}
            onChange={set('country')}
          />
        </div>
        <Input
          label="Address"
          placeholder="123 Main St"
          value={form.address}
          onChange={set('address')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initial.name ? 'Save changes' : 'Add client'}
        </Button>
      </div>
    </form>
  );
}

/* ── main page ───────────────────────────────────────── */
export default function Clients() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { clients, isLoading, error, create, update, remove } = useClients(
    debouncedSearch || undefined
  );

  const handleCreate = async (data: Partial<Client>) => {
    setIsSaving(true);
    try {
      await create(data);
      setShowAdd(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Partial<Client>) => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      await update(editTarget.id, data);
      setEditTarget(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? '…' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors w-52"
            />
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Client
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24 text-sm text-red-500">{error}</div>
      ) : clients.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
            {['Client', 'Contact', 'Location', 'Invoices', ''].map((h) => (
              <span key={h} className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {clients.map((client) => (
              <div
                key={client.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-gray-50/60 transition-colors group"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-white text-xs font-bold',
                      avatarColor(client.name)
                    )}
                  >
                    {initials(client.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                    <p className="text-xs text-gray-400 md:hidden truncate">{client.email}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="hidden md:flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 truncate">
                    <Mail size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Phone size={11} className="flex-shrink-0" />
                      {client.phone}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-500">
                  {(client.city || client.country) ? (
                    <>
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {[client.city, client.country].filter(Boolean).join(', ')}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>

                {/* Invoice count */}
                <div className="hidden md:flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-sm">
                    <FileText size={13} className="text-gray-400" />
                    <span className="font-medium text-gray-700">
                      {(client as Client & { invoice_count?: number }).invoice_count ?? 0}
                    </span>
                    <button
                      onClick={() => navigate(`/invoices?client=${client.id}`)}
                      className="text-xs text-primary-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      view
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => navigate(`/invoices?client=${client.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors md:hidden"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setEditTarget(client)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    title="Edit client"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(client)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete client"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add new client"
        subtitle="Fill in the client's contact details"
      >
        <ClientForm
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          isLoading={isSaving}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit client"
        subtitle={editTarget?.name}
      >
        <ClientForm
          initial={editTarget ?? {}}
          onSubmit={handleUpdate}
          onCancel={() => setEditTarget(null)}
          isLoading={isSaving}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete client"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone. Any invoices linked to this client will be affected.`}
        confirmLabel="Delete client"
        isLoading={isDeleting}
      />
    </div>
  );
}
