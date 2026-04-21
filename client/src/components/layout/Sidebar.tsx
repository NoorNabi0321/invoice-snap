import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Settings,
  LogOut, Zap, Plus, X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.business_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleNav = () => {
    onClose?.();
  };

  const handleNewInvoice = () => {
    navigate('/invoices/new');
    onClose?.();
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-white border-r border-gray-100',
        'transform transition-transform duration-200 ease-in-out',
        'lg:static lg:translate-x-0 lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo + mobile close */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">InvoiceSnap</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* New Invoice CTA */}
      <div className="px-4 pt-4">
        <button
          onClick={handleNewInvoice}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={15} />
          New Invoice
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Menu
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={handleNav}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & logout */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 mb-1">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {user?.business_name || 'My Business'}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <LogOut size={16} className="text-gray-400" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
