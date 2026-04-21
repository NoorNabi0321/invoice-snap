import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.data.token, res.data.data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
          <p className="mt-2 text-gray-500">Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600',
                  errors.email
                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 flex items-center gap-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <button
                type="button"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600',
                  errors.password
                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:ring-offset-2',
              isLoading
                ? 'bg-primary-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 active:scale-[0.98] shadow-sm shadow-primary-600/25'
            )}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400 bg-gray-50 px-4">
            <span className="px-2 bg-gray-50">New to InvoiceSnap?</span>
          </div>
        </div>

        {/* Register link */}
        <Link
          to="/register"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          Create a free account
        </Link>
      </div>
    </AuthLayout>
  );
}
