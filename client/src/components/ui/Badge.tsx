import { cn } from '../../utils/cn';
import type { InvoiceStatus } from '../../types';

interface BadgeProps {
  status: InvoiceStatus;
  className?: string;
}

const statusStyles: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
