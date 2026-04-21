import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, Lock, Building2 } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import api from '../services/api';
import toast from 'react-hot-toast';

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-400' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-400' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-400' };
  return { score, label: 'Very strong', color: 'bg-emerald-500' };
}

export default function Register() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    businessName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const { login } = useAuth();
  const navigate = useNavigate();
  const strength = getPasswordStrength(password);

  const validate = () => {
    const e: typeof errors = {};
    if (!businessName.trim()) e.businessName = 'Business name is required';
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        business_name: businessName,
      });
      login(res.data.data.token, res.data.data.user);
      toast.success('Account created! Welcome to InvoiceSnap.');
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = (hasError?: string) =>
    cn(
      'w-full py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600',
      hasError
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
        : 'border-gray-200 bg-white hover:border-gray-300'
    );

  return (
    <AuthLayout>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create your account</h2>
          <p className="mt-2 text-gray-500">Start managing invoices like a pro — free forever.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Business name</label>
            <div className="relative">
              <Building2
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (errors.businessName) setErrors((p) => ({ ...p, businessName: undefined }));
                }}
                placeholder="Acme Corp"
                autoComplete="organization"
                className={cn(fieldClass(errors.businessName), 'pl-10 pr-4')}
              />
            </div>
            {errors.businessName && <p className="text-xs text-red-500">{errors.businessName}</p>}
          </div>

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
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className={cn(fieldClass(errors.email), 'pl-10 pr-4')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Password</label>
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
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className={cn(fieldClass(errors.password), 'pl-10 pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength */}
            {password && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i <= strength.score ? strength.color : 'bg-gray-200'
                      )}
                    />
                  ))}
                </div>
                <p className={cn('text-xs font-medium',
                  strength.score <= 1 ? 'text-red-500' :
                  strength.score <= 2 ? 'text-amber-500' :
                  strength.score <= 3 ? 'text-yellow-600' : 'text-emerald-600'
                )}>
                  {strength.label}
                </p>
              </div>
            )}
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Confirm password</label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={cn(fieldClass(errors.confirmPassword), 'pl-10 pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-400 leading-relaxed pt-1">
            By creating an account you agree to our{' '}
            <button type="button" className="text-primary-600 hover:underline">Terms of Service</button>{' '}
            and{' '}
            <button type="button" className="text-primary-600 hover:underline">Privacy Policy</button>.
          </p>

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
                Creating account…
              </>
            ) : (
              <>
                Create free account
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
          <div className="relative flex justify-center">
            <span className="px-2 bg-gray-50 text-xs text-gray-400">Already have an account?</span>
          </div>
        </div>

        {/* Login link */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          Sign in instead
        </Link>
      </div>
    </AuthLayout>
  );
}
