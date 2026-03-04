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
    <div className="flex min-h-screen bg-background dot-grid">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content shell */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-[margin] duration-300 ease-in-out ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'
          }`}
      >
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-white/8 sticky top-0 z-20 shadow-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <img src="/logo.jpg" alt="YES YES" className="h-6 w-auto object-contain rounded-md" />
          <span className="font-bold text-white text-sm tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            YES YES ERP
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  );
};
