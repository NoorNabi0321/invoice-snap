import { formatCurrency } from '../../utils/formatCurrency';

interface InvoiceTotalsProps {
  subtotal: number;   // cents
  taxRate: number;     // percentage (e.g. 10 for 10%)
  discountAmount: number; // cents
  onTaxRateChange?: (rate: number) => void;
  onDiscountChange?: (amount: number) => void;
  editable?: boolean;
}

export function InvoiceTotals({
  subtotal,
  taxRate,
  discountAmount,
  onTaxRateChange,
  onDiscountChange,
  editable = false,
}: InvoiceTotalsProps) {
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount - discountAmount;

  return (
    <div className="flex justify-end">
      <div className="w-72 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">Tax</span>
          <div className="flex items-center gap-2">
            {editable ? (
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxRate}
                onChange={(e) => onTaxRateChange?.(parseFloat(e.target.value) || 0)}
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <span className="text-muted">({taxRate}%)</span>
            )}
            <span className="font-medium w-24 text-right">{formatCurrency(taxAmount)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">Discount</span>
          <div className="flex items-center gap-2">
            {editable ? (
              <input
                type="number"
                min="0"
                step="0.01"
                value={(discountAmount / 100).toFixed(2)}
                onChange={(e) => onDiscountChange?.(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <span className="font-medium w-24 text-right text-danger">
                {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : formatCurrency(0)}
              </span>
            )}
            {editable && (
              <span className="font-medium w-24 text-right text-danger">
                {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : formatCurrency(0)}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
