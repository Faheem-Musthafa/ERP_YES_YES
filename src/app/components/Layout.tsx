import React, { ReactNode, useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { GlobalSearch } from '@/app/components/GlobalSearch';
import { Menu, Bell, Search, Command } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-background dot-grid">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      <GlobalSearch isOpen={searchOpen} onOpenChange={setSearchOpen} />
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
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-white/8 sticky top-0 z-20 shadow-lg">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <img src="/logo.jpg" alt="YES YES" className="h-6 w-auto object-contain rounded-md" />
          <span className="font-bold text-white text-sm tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            YES YES ERP
          </span>
        </header>

        {/* Desktop command bar */}
        <header className="hidden lg:flex items-center justify-between gap-4 px-6 py-4 border-b border-border/70 bg-card/75 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Command size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Enterprise Control Wall</p>
              <p className="text-xs text-muted-foreground">YES YES ERP · {today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-9 px-3 rounded-xl border border-border/80 bg-background/80 text-muted-foreground text-xs font-medium inline-flex items-center gap-2 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Search size={13} /> Quick Search
            </button>
            <button
              type="button"
              aria-label="Open notifications"
              className="h-9 w-9 rounded-xl border border-border/80 bg-background/80 text-muted-foreground inline-flex items-center justify-center hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Bell size={14} />
            </button>
            <div className="h-9 px-3 rounded-xl border border-border/80 bg-background/80 text-xs inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">{user?.role ?? 'user'}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-up">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
