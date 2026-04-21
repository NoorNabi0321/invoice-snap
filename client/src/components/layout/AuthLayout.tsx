import type { ReactNode } from 'react';
import { Zap, FileText, Users, BarChart3, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: FileText, text: 'Create beautiful PDF invoices in minutes' },
  { icon: Users, text: 'Manage clients and track relationships' },
  { icon: BarChart3, text: 'Real-time revenue analytics & insights' },
];

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-primary-600 via-indigo-700 to-indigo-900 p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-white/5" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">InvoiceSnap</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Professional invoicing,{' '}
              <span className="text-indigo-200">made simple.</span>
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed">
              Everything you need to run your freelance business — invoices, clients, and payments — all in one place.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((l) => (
                <div
                  key={l}
                  className="w-8 h-8 rounded-full bg-white/20 border-2 border-indigo-600 flex items-center justify-center text-xs font-semibold text-white"
                >
                  {l}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-indigo-200 text-sm">
              <CheckCircle2 size={14} className="text-green-400" />
              Trusted by 500+ freelancers
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-indigo-300 text-xs">
          © {new Date().getFullYear()} InvoiceSnap. All rights reserved.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">InvoiceSnap</span>
        </div>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
