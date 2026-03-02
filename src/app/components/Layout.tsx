import React, { ReactNode, useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`flex-1 min-w-0 transition-[margin] duration-300 ease-in-out ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
          <img src="/logo.jpg" alt="YES YES" className="h-7 w-auto object-contain rounded" />
          <span className="font-bold text-gray-700 text-sm tracking-wide">YES YES MARKETING</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};
