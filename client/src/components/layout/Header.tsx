import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: "Here's your business overview" },
  '/invoices': { title: 'Invoices', subtitle: 'Manage and track all your invoices' },
  '/invoices/new': { title: 'New Invoice', subtitle: 'Create a new invoice for a client' },
  '/clients': { title: 'Clients', subtitle: 'Manage your client relationships' },
  '/settings': { title: 'Settings', subtitle: 'Update your business profile' },
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const page =
    pageTitles[pathname] ??
    (pathname.includes('/invoices/')
      ? { title: 'Invoice', subtitle: 'Invoice details' }
      : { title: 'InvoiceSnap', subtitle: '' });

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6 gap-3">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate sm:text-base">{page.title}</h1>
          {page.subtitle && (
            <p className="text-xs text-gray-400 truncate hidden sm:block">{page.subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold">
            {(user?.business_name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-gray-900 leading-none">
              {user?.business_name || 'My Business'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
