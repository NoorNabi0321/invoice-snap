import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-lg border border-gray-200 shadow-sm p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
