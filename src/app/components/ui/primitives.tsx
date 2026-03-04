/**
 * Shared UI primitives for the YES YES ERP system.
 * Drop-in replacements that apply the new design system universally.
 */
import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/components/ui/utils';

// ── PageHeader ────────────────────────────────────────────────────────────────
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}
export const PageHeader = ({ title, subtitle, actions, className }: PageHeaderProps) => (
    <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6', className)}>
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
);

// ── SearchBar ─────────────────────────────────────────────────────────────────
interface SearchBarProps {
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    className?: string;
}
export const SearchBar = ({ placeholder = 'Search...', value, onChange, className }: SearchBarProps) => (
    <div className={cn('relative', className)}>
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="pl-9 h-9 bg-background border-border text-sm"
        />
    </div>
);

// ── DataCard ──────────────────────────────────────────────────────────────────
// Wraps tables/lists in a clean bordered card with consistent corner radius
export const DataCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
        'bg-card border border-border rounded-xl shadow-sm overflow-hidden',
        className
    )}>
        {children}
    </div>
);

// ── TableHead ─────────────────────────────────────────────────────────────────
export const StyledThead = ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-muted/40 border-b border-border">
        {children}
    </thead>
);

export const StyledTh = ({
    children, className, right
}: { children?: React.ReactNode; className?: string; right?: boolean }) => (
    <th className={cn(
        'px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground',
        right ? 'text-right' : 'text-left',
        className
    )}>
        {children}
    </th>
);

export const StyledTr = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={cn('hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0', className)}>
        {children}
    </tr>
);

export const StyledTd = ({
    children, className, right, mono
}: { children?: React.ReactNode; className?: string; right?: boolean; mono?: boolean }) => (
    <td className={cn(
        'px-4 py-3 text-sm',
        right ? 'text-right' : 'text-left',
        mono ? 'font-mono' : '',
        className
    )}>
        {children}
    </td>
);

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({
    icon: Icon, message, sub
}: { icon: React.ElementType; message: string; sub?: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Icon size={36} className="mb-3 opacity-25" />
        <p className="font-medium text-sm">{message}</p>
        {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ className }: { className?: string }) => (
    <div className={cn('flex items-center justify-center py-16', className)}>
        <Loader2 size={28} className="animate-spin text-primary/60" />
    </div>
);

// ── FormSection ───────────────────────────────────────────────────────────────
export const FormSection = ({
    title, subtitle, children, className
}: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) => (
    <div className={cn('space-y-4', className)}>
        <div className="pb-2 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {children}
    </div>
);

// ── FormCard ──────────────────────────────────────────────────────────────────
export const FormCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm p-6 max-w-2xl', className)}>
        {children}
    </div>
);

// ── StatusBadge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400',
    Inactive: 'bg-slate-50 text-slate-500 border-slate-200/80 dark:bg-slate-900/50 dark:text-slate-400',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400',
    Rejected: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/50 dark:text-red-400',
    Billed: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-400',
    Delivered: 'bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-950/50 dark:text-violet-400',
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    Unpaid: 'bg-red-50 text-red-700 border-red-200/80',
    Cleared: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    Bounced: 'bg-red-50 text-red-700 border-red-200/80',
    Received: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    'Not Received': 'bg-amber-50 text-amber-700 border-amber-200/80',
    Credited: 'bg-blue-50 text-blue-700 border-blue-200/80',
};

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
    <span className={cn(
        'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border',
        className
    )}>
        {status}
    </span>
);

// ── ActionButton ──────────────────────────────────────────────────────────────
// Ghost icon-only buttons for table rows
export const IconBtn = ({
    onClick, title, children, danger, className
}: {
    onClick?: () => void;
    title?: string;
    children: React.ReactNode;
    danger?: boolean;
    className?: string;
}) => (
    <button
        onClick={onClick}
        title={title}
        className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150',
            danger
                ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/8',
            className
        )}
    >
        {children}
    </button>
);
