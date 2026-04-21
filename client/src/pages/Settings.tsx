import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Camera, Building2, Palette } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'MXN', label: 'MXN — Mexican Peso' },
  { value: 'BRL', label: 'BRL — Brazilian Real' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
];

function getLogoSrc(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  const base = (import.meta.env.VITE_API_URL as string || '/api').replace(/\/api$/, '');
  return `${base}${logoUrl}`;
}

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    business_name: user?.business_name ?? '',
    business_email: user?.business_email ?? '',
    business_address: user?.business_address ?? '',
    business_phone: user?.business_phone ?? '',
    currency: user?.currency ?? 'USD',
  });
  const [formErrors, setFormErrors] = useState<{ business_email?: string }>({});
  const [saving, setSaving] = useState(false);

  // Logo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(getLogoSrc(user?.logo_url ?? null));
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: typeof formErrors = {};
    if (form.business_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.business_email)) {
      errs.business_email = 'Enter a valid email address';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setPendingFile(file);
  };

  const handleLogoUpload = async () => {
    if (!pendingFile) return;
    setUploadingLogo(true);
    try {
      const { logo_url } = await userService.uploadLogo(pendingFile);
      updateUser({ ...user!, logo_url });
      setPendingFile(null);
      toast.success('Logo updated');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const updated = await userService.updateProfile({
        business_name: form.business_name || undefined,
        business_email: form.business_email || undefined,
        business_address: form.business_address || undefined,
        business_phone: form.business_phone || undefined,
        currency: form.currency,
      });
      updateUser(updated);
      toast.success('Profile saved');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const initials = (user.business_name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your business profile and preferences.</p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Camera className="w-4 h-4 text-muted" />
          <h2 className="text-base font-semibold text-gray-900">Business Logo</h2>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Business logo"
                className="w-20 h-20 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-indigo-100 flex items-center justify-center border border-indigo-200">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              Choose Image
            </Button>
            {pendingFile && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleLogoUpload}
                isLoading={uploadingLogo}
              >
                Upload Logo
              </Button>
            )}
            <p className="text-xs text-muted">JPEG, PNG or WebP · Max 2 MB</p>
          </div>
        </div>
      </div>

      {/* Business Info + Preferences */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-4 h-4 text-muted" />
            <h2 className="text-base font-semibold text-gray-900">Business Information</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Business Name"
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              placeholder="Acme Studio"
            />
            <Input
              label="Business Email"
              name="business_email"
              type="email"
              value={form.business_email}
              onChange={handleChange}
              placeholder="billing@acme.com"
              error={formErrors.business_email}
            />
            <Input
              label="Phone"
              name="business_phone"
              type="tel"
              value={form.business_phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
            />
            <Input
              label="Address"
              name="business_address"
              value={form.business_address}
              onChange={handleChange}
              placeholder="123 Main St, New York, NY 10001"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-4 h-4 text-muted" />
            <h2 className="text-base font-semibold text-gray-900">Preferences</h2>
          </div>

          <Select
            label="Currency"
            name="currency"
            value={form.currency}
            onChange={handleChange}
            options={CURRENCIES}
          />
          <p className="text-xs text-muted mt-2">
            Used on all new invoices and PDF exports.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
