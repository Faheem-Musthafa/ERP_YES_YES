import React, { ReactNode } from 'react';
import { Sidebar } from '@/app/components/Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 flex-1">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};
