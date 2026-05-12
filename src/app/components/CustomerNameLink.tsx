import React from 'react';
import { useCustomerDialog } from '@/app/components/CustomerDialogProvider';

interface Props {
  customerId: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  title?: string;
  stopPropagation?: boolean;
}

export const CustomerNameLink = ({ customerId, children, className, title, stopPropagation = true }: Props) => {
  const { openCustomer } = useCustomerDialog();
  if (!customerId) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        openCustomer(customerId);
      }}
      className={`text-left hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded ${className ?? ''}`}
      title={title ?? `Open ${typeof children === 'string' ? children : 'customer'} history`}
    >
      {children}
    </button>
  );
};
