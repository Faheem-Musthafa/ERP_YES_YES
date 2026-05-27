import React from 'react';
import { Link } from 'react-router';
import {
  ShoppingCart, TrendingUp, PackageOpen, Tags, BarChart3, Wallet, ClipboardCheck,
  ChevronRight, LogOut, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

interface MoreLink {
  label: string;
  hint: string;
  to?: string;
  onClick?: () => void;
  icon: LucideIcon;
  tone: 'indigo' | 'slate' | 'rose';
}

const TONE_MAP: Record<MoreLink['tone'], string> = {
  indigo: 'sm-gradient-soft text-[var(--sm-primary)]',
  slate:  'bg-slate-100 text-slate-600',
  rose:   'bg-rose-50 text-rose-700',
};

export const SalesMore = () => {
  const { user, logout } = useAuth();

  const sections: { title: string; items: MoreLink[] }[] = [
    {
      title: 'Orders',
      items: [
        { label: 'My Orders', hint: 'Everything you have submitted', to: '/sales/my-orders', icon: ShoppingCart, tone: 'indigo' },
        { label: 'Approved Sales', hint: 'Closed-won pipeline', to: '/sales/approved-sales', icon: TrendingUp, tone: 'indigo' },
        { label: 'Back Orders', hint: 'Pending fulfilment', to: '/sales/back-orders', icon: PackageOpen, tone: 'slate' },
      ],
    },
    {
      title: 'Money',
      items: [
        { label: 'My Collection', hint: 'Receipts you have logged', to: '/sales/my-collection', icon: Wallet, tone: 'indigo' },
        { label: 'Collection Status', hint: 'Outstanding & overdue', to: '/sales/collection-status', icon: ClipboardCheck, tone: 'slate' },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { label: 'Price List', hint: 'Brand × tier pricing', to: '/sales/price-list', icon: Tags, tone: 'slate' },
        { label: 'Stock View', hint: 'Live inventory by godown', to: '/stock', icon: BarChart3, tone: 'slate' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Sign Out', hint: 'End this session', onClick: () => void logout(), icon: LogOut, tone: 'rose' },
      ],
    },
  ];

  return (
    <div className="lg:hidden sm-font sm-surface -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 min-h-[calc(100vh-4rem)]">
      <div className="space-y-5 px-4 pt-5 pb-4 max-w-2xl mx-auto">
        <header className="sm-rise">
          <p className="sm-eyebrow text-[var(--sm-muted)]">Account</p>
          <h1 className="sm-headline text-[26px] text-[var(--sm-text)] mt-0.5">
            {user?.full_name?.split(' ')[0] ?? 'Sales rep'}
          </h1>
          <p className="text-sm text-[var(--sm-muted)] mt-1 truncate">{user?.email}</p>
        </header>

        {sections.map((sec, i) => (
          <section key={sec.title} className={`sm-rise sm-rise-${Math.min(i + 1, 4)}`}>
            <p className="sm-eyebrow text-[var(--sm-muted)] mb-2 px-1">{sec.title}</p>
            <ul className="sm-card overflow-hidden divide-y divide-[var(--sm-border)]">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <span className={`shrink-0 h-10 w-10 sm-pill flex items-center justify-center ${TONE_MAP[item.tone]}`}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--sm-text)]">{item.label}</p>
                      <p className="text-xs text-[var(--sm-muted)] truncate">{item.hint}</p>
                    </div>
                    <ChevronRight size={16} className="text-[var(--sm-muted)] shrink-0" />
                  </>
                );
                const cls = 'sm-tap flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-slate-50 active:bg-slate-100';
                return (
                  <li key={item.label}>
                    {item.to
                      ? <Link to={item.to} className={cls}>{inner}</Link>
                      : <button type="button" onClick={item.onClick} className={cls}>{inner}</button>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};
