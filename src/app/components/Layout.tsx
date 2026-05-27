import React, { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { SalesMobileNav } from '@/app/components/SalesMobileNav';
import { GlobalSearch } from '@/app/components/GlobalSearch';
import { Menu, Bell, Search, Command, AlertTriangle, ClipboardCheck, Truck, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { cloneCompanyProfiles, getPrimaryCompanyName, loadCompanyProfiles } from '@/app/companyProfiles';
import { useNotifications } from '@/app/lib/queries/notifications';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpenMobile, setNotificationOpenMobile] = useState(false);
  const [notificationOpenDesktop, setNotificationOpenDesktop] = useState(false);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const { user } = useAuth();
  const navigate = useNavigate();
  // Shared notification feed across all mounts. react-query handles dedupe,
  // 60s refetch, and skips polling while tab is hidden via its built-in
  // visibilityState integration (refetchIntervalInBackground: false).
  const { notifications, isLoading: notificationsLoading } = useNotifications(user?.role);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const primaryCompanyName = getPrimaryCompanyName(companyProfiles);

  useEffect(() => {
    void loadCompanyProfiles()
      .then(setCompanyProfiles)
      .catch(() => undefined);
  }, []);

  const notificationCount = notifications.length;
  const toneIcon = (tone: 'rose' | 'amber' | 'blue') => {
    if (tone === 'rose') return <AlertTriangle size={14} className="text-rose-500" />;
    if (tone === 'amber') return <Truck size={14} className="text-amber-500" />;
    return <ClipboardCheck size={14} className="text-blue-500" />;
  };

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
        {/* Mobile top bar — minimal sticky for sales, original for others */}
        {user?.role === 'sales' ? (
          <header
            className="lg:hidden flex items-center justify-between gap-2 px-3 py-2.5 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 sticky top-0 z-20 sm-font"
          >
            
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="sm-tap flex-1 mx-1 h-9 rounded-xl bg-slate-100 text-slate-500 px-3 inline-flex items-center gap-2 text-xs font-semibold"
            >
              <Search size={14} />
              <span className="truncate">Search customers, orders…</span>
            </button>
            <DropdownMenu open={notificationOpenMobile} onOpenChange={setNotificationOpenMobile}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open notifications"
                  className="sm-tap relative h-9 w-9 rounded-xl bg-slate-100 text-slate-700 inline-flex items-center justify-center"
                >
                  <Bell size={16} />
                  {notificationCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl border-border/70 p-2 shadow-xl">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationsLoading ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : notificationCount === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No alerts</div>
                ) : (
                  notifications.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onSelect={(event) => {
                        event.preventDefault();
                        setNotificationOpenMobile(false);
                        requestAnimationFrame(() => navigate(item.href));
                      }}
                      className="flex items-start gap-3 rounded-xl px-3 py-3"
                    >
                      <div className="mt-0.5">{toneIcon(item.tone)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
        ) : (
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-white/8 sticky top-0 z-20 shadow-lg">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <img src="/logo.jpg" alt={primaryCompanyName} className="h-6 w-auto object-contain rounded-md" />
            <span className="font-bold text-white text-sm tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {primaryCompanyName} ERP
            </span>
          </header>
        )}

        {/* Desktop command bar */}
        <header className="hidden lg:flex items-center justify-between gap-4 px-6 py-4 border-b border-border/70 bg-card/75 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Command size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Enterprise Control Wall</p>
              <p className="text-xs text-muted-foreground">{primaryCompanyName} ERP · {today}</p>
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
            <DropdownMenu open={notificationOpenDesktop} onOpenChange={setNotificationOpenDesktop}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open notifications"
                  className="relative h-9 w-9 rounded-xl border border-border/80 bg-background/80 text-muted-foreground inline-flex items-center justify-center hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Bell size={14} />
                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl border-border/70 p-2 shadow-xl">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Notifications</p>
                      <p className="text-xs font-normal text-muted-foreground">Live operational alerts</p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                      <ShoppingCart size={11} />
                      {notificationCount}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationsLoading ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : notificationCount === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No active notifications right now.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onSelect={(event) => {
                        event.preventDefault();
                        setNotificationOpenDesktop(false);
                        requestAnimationFrame(() => navigate(item.href));
                      }}
                      className="flex items-start gap-3 rounded-xl px-3 py-3"
                    >
                      <div className="mt-0.5">{toneIcon(item.tone)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-9 px-3 rounded-xl border border-border/80 bg-background/80 text-xs inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">{user?.role ?? 'user'}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className={`flex-1 p-4 sm:p-6 lg:p-8 animate-fade-up ${user?.role === 'sales' ? 'pb-28 lg:pb-8' : ''}`}
        >
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>

      {user?.role === 'sales' && <SalesMobileNav />}
    </div>
  );
};
