import { cn } from '../../utils/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-gray-200 border-t-primary-600',
        sizes[size],
        className
      )}
    />
  );
}
