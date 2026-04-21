import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, Clock, AlertTriangle, Users, Plus, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import type { DashboardStats, ChartDataPoint, Invoice } from '../types';

function fmtMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ label, value, sub, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex items-start gap-4">
      <div className={`flex-shrink-0 p-3 rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{formatCurrency(payload[0]!.value)}</p>
    </div>
  );
}

function StatsSection({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Total Revenue"
        value={formatCurrency(stats.total_revenue)}
        sub="From paid invoices"
        icon={<DollarSign className="w-5 h-5 text-green-600" />}
        iconBg="bg-green-50"
      />
      <StatCard
        label="Pending"
        value={formatCurrency(stats.total_pending)}
        sub="Draft & sent invoices"
        icon={<Clock className="w-5 h-5 text-blue-600" />}
        iconBg="bg-blue-50"
      />
      <StatCard
        label="Overdue"
        value={String(stats.overdue_count)}
        sub={stats.overdue_count === 1 ? 'invoice overdue' : 'invoices overdue'}
        icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        iconBg="bg-amber-50"
      />
      <StatCard
        label="Clients"
        value={String(stats.total_clients)}
        sub={`${stats.invoices_this_month} invoice${stats.invoices_this_month !== 1 ? 's' : ''} this month`}
        icon={<Users className="w-5 h-5 text-indigo-600" />}
        iconBg="bg-indigo-50"
      />
    </div>
  );
}

function RevenueChart({ data }: { data: ChartDataPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: fmtMonth(d.month) }));
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Monthly Revenue</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `$${(v / 100).toLocaleString('en-US', { notation: 'compact' })}`}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Invoices</h2>
        <Link to="/invoices" className="text-sm text-primary hover:underline font-medium">
          View all
        </Link>
      </div>
      {invoices.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No invoices yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <Link
                to={`/invoices/${inv.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.invoice_number}</p>
                  <p className="text-xs text-muted truncate">{inv.client_name || '—'} · {formatDate(inv.issue_date)}</p>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <Badge status={inv.status} />
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, chart, recentInvoices, loading, error } = useDashboard();

  const greeting = user?.business_name || user?.email?.split('@')[0] || 'there';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex items-start gap-4">
              <Skeleton className="w-11 h-11 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-[220px] w-full" />
          </div>
          <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-2">{error || 'Failed to load dashboard'}</p>
        <p className="text-sm text-muted">Try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {greeting}!</h1>
          <p className="text-sm text-muted mt-0.5">Here's what's happening with your invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/clients">
            <Button variant="secondary" size="sm">
              <Users className="w-4 h-4 mr-1.5" />
              New Client
            </Button>
          </Link>
          <Link to="/invoices/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <StatsSection stats={stats} />

      {/* Chart + Recent Invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <RevenueChart data={chart} />
        </div>
        <div className="xl:col-span-2">
          <RecentInvoices invoices={recentInvoices} />
        </div>
      </div>

      {/* Empty state CTA */}
      {stats.total_invoices === 0 && (
        <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-8 text-center">
          <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">Create your first invoice</h3>
          <p className="text-sm text-muted mb-4">Start getting paid by sending professional invoices to your clients.</p>
          <Link to="/invoices/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
