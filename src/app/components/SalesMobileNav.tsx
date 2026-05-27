import React from 'react';
import { Link, useLocation } from 'react-router';
import { Home, Users, Plus, Wallet, MoreHorizontal, type LucideIcon } from 'lucide-react';

interface TabDef {
  label: string;
  path: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  prominent?: boolean;
}

const TABS: TabDef[] = [
  {
    label: 'Home',
    path: '/sales',
    icon: Home,
    match: (p) => p === '/sales' || p === '/sales/',
  },
  {
    label: 'Customers',
    path: '/sales/my-customers',
    icon: Users,
    match: (p) => p.startsWith('/sales/my-customers'),
  },
  {
    label: 'New Order',
    path: '/sales/create-order',
    icon: Plus,
    match: (p) => p.startsWith('/sales/create-order'),
    prominent: true,
  },
  {
    label: 'Collect',
    path: '/sales/receipt',
    icon: Wallet,
    match: (p) =>
      p.startsWith('/sales/receipt')
      || p.startsWith('/sales/my-collection'),
  },
  {
    label: 'More',
    path: '/sales/more',
    icon: MoreHorizontal,
    match: (p) =>
      p.startsWith('/sales/more')
      || p.startsWith('/sales/my-orders')
      || p.startsWith('/sales/approved-sales')
      || p.startsWith('/sales/back-orders')
      || p.startsWith('/sales/price-list')
      || p.startsWith('/sales/credit-note')
      || p.startsWith('/sales/stock-transfer')
      || p.startsWith('/sales/collection-status')
      || p.startsWith('/stock'),
  },
];

export const SalesMobileNav = () => {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Sales primary navigation"
      className="sm-font sm-safe-bottom lg:hidden fixed bottom-0 inset-x-0 z-20"
    >
      <div className="mx-2 mb-2 sm-card overflow-visible !rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_-12px_28px_-12px_rgba(15,23,42,0.18)]">
        <ul className="grid grid-cols-5 px-1 pt-1.5">
          {TABS.map((tab) => {
            const isActive = tab.match(pathname);
            const Icon = tab.icon;
            if (tab.prominent) {
              return (
                <li key={tab.path} className="flex justify-center -mt-7">
                  <Link
                    to={tab.path}
                    aria-label={tab.label}
                    className="sm-tap relative h-14 w-14 sm-gradient sm-pill flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(79,70,229,0.55)] ring-4 ring-white"
                  >
                    <Icon size={26} strokeWidth={2.6} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.path} className="flex justify-center">
                <Link
                  to={tab.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`sm-tap flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl text-[10px] font-semibold tracking-wide ${
                    isActive
                      ? 'text-[var(--sm-primary)]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.6 : 2} />
                  <span>{tab.label}</span>
                  <span
                    className={`mt-0.5 h-1 w-1 rounded-full transition-all ${
                      isActive ? 'bg-[var(--sm-primary)] scale-100' : 'scale-0'
                    }`}
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
