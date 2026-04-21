import { Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatCurrency';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number; // cents
}

export interface LineItemError {
  description?: string;
  quantity?: string;
  rate?: string;
}

interface LineItemRowProps {
  item: LineItem;
  index: number;
  onChange: (id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  error?: LineItemError;
}

export function LineItemRow({ item, index, onChange, onRemove, disabled, error }: LineItemRowProps) {
  const amount = item.quantity * item.rate;

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-2 text-sm text-muted align-top pt-3">{index + 1}</td>

      <td className="py-2 pr-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange(item.id, 'description', e.target.value)}
          placeholder="Item description"
          disabled={disabled}
          className={cn(
            'w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 transition-colors',
            error?.description
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary focus:ring-primary'
          )}
        />
        {error?.description && (
          <p className="text-xs text-red-500 mt-0.5">{error.description}</p>
        )}
      </td>

      <td className="py-2 pr-2 align-top">
        <input
          type="number"
          min="0.01"
          step="1"
          value={item.quantity}
          onChange={(e) => onChange(item.id, 'quantity', Math.max(0.01, parseFloat(e.target.value) || 0))}
          disabled={disabled}
          className={cn(
            'w-20 rounded-md border px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-1 disabled:bg-gray-50 transition-colors',
            error?.quantity
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary focus:ring-primary'
          )}
        />
      </td>

      <td className="py-2 pr-2 align-top">
        <input
          type="number"
          min="0"
          step="0.01"
          value={(item.rate / 100).toFixed(2)}
          onChange={(e) => onChange(item.id, 'rate', Math.round(parseFloat(e.target.value || '0') * 100))}
          disabled={disabled}
          className={cn(
            'w-28 rounded-md border px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-1 disabled:bg-gray-50 transition-colors',
            error?.rate
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary focus:ring-primary'
          )}
        />
      </td>

      <td className="py-2 pr-2 text-sm text-right font-medium align-top pt-3">
        {formatCurrency(amount)}
      </td>

      <td className="py-2 text-center align-top pt-2.5">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={disabled}
          className="text-gray-400 hover:text-danger transition-colors disabled:opacity-50"
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
