/**
 * Shared UI primitives for the YES YES ERP system.
 * Drop-in replacements that apply the new design system universally.
 */
import React from 'react';
import { Search, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/components/ui/utils';
import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';

// ── Universal Tooltip ─────────────────────────────────────────────────────────────
interface TooltipProps {
    children: React.ReactNode;
    content: string | React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}
export const CustomTooltip = ({ children, content, side = 'top', className }: TooltipProps) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent side={side} className={cn('bg-slate-900 text-white text-xs px-2 py-1.5 rounded-md', className)}>
                {content}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

// ── PageHeader ────────────────────────────────────────────────────────────────
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}
export const PageHeader = ({ title, subtitle, actions, className }: PageHeaderProps) => (
    <div className={cn('enterprise-frame flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-end sm:justify-between', className)}>
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.7rem]">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
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
        <Search
            size={14}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80"
        />
        <Input
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            aria-label={placeholder}
            className="h-10 rounded-xl border-border/80 bg-card pl-9 text-sm shadow-xs"
        />
    </div>
);

interface FilterFieldProps {
    label: string;
    children: React.ReactNode;
    className?: string;
}
export const FilterField = ({ label, children, className }: FilterFieldProps) => (
    <div className={cn('space-y-1.5', className)}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {children}
    </div>
);

export const FilterBar = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <DataCard className={cn('p-4', className)}>
        <div role="region" aria-label="Filter controls" className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {children}
        </div>
    </DataCard>
);

// ── DataCard ──────────────────────────────────────────────────────────────────
// Wraps tables/lists in a clean bordered card with consistent corner radius
export const DataCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
        'panel-surface overflow-hidden',
        className
    )}>
        {children}
    </div>
);

// ── TableHead ─────────────────────────────────────────────────────────────────
export const StyledThead = ({ children }: { children: React.ReactNode }) => (
    <thead className="border-b border-border/80 bg-slate-50/70 dark:bg-slate-900/40">
        {children}
    </thead>
);

export const StyledTh = ({
    children, className, right, center
}: { children?: React.ReactNode; className?: string; right?: boolean; center?: boolean }) => (
    <th scope="col" className={cn(
        'px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground',
        center ? 'text-center' : '',
        right ? 'text-right' : 'text-left',
        className
    )}>
        {children}
    </th>
);

export const StyledTr = ({
    children, className, ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { children: React.ReactNode }) => (
    <tr
        className={cn(
            'border-b border-border/60 transition-colors hover:bg-primary/[0.04] focus-within:bg-primary/[0.04] focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-inset last:border-0',
            className
        )}
        {...props}
    >
        {children}
    </tr>
);

export const StyledTd = ({
    children, className, right, center, mono
}: { children?: React.ReactNode; className?: string; right?: boolean; center?: boolean; mono?: boolean }) => (
    <td className={cn(
        'px-4 py-3.5 text-sm',
        center ? 'text-center' : '',
        right ? 'text-right' : 'text-left',
        mono ? 'font-mono' : '',
        className
    )}>
        {children}
    </td>
);

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({
    icon: Icon, message, sub, action
}: { icon: React.ElementType; message: string; sub?: string; action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" role="status" aria-live="polite">
        <Icon size={36} aria-hidden="true" className="mb-3 opacity-25" />
        <p className="font-medium text-sm">{message}</p>
        {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export const ErrorState = ({ message, retryLabel = 'Retry', onRetry }: { message: string; retryLabel?: string; onRetry?: () => void }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center" role="alert">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={18} />
        </div>
        <p className="text-sm font-medium text-foreground">{message}</p>
        {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
                {retryLabel}
            </Button>
        )}
    </div>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ className, size = 28 }: { className?: string; size?: number }) => (
    <div className={cn('flex items-center justify-center py-16', className)} role="status" aria-live="polite">
        <Loader2 size={size} aria-hidden="true" className="animate-spin text-primary/60" />
        <span className="sr-only">Loading</span>
    </div>
);

// ── FormSection ───────────────────────────────────────────────────────────────
export const FormSection = ({
    title, subtitle, action, children, className
}: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <div className={cn('space-y-4', className)}>
        <div className="pb-2 border-b border-border">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
        </div>
        {children}
    </div>
);

// ── FormCard ──────────────────────────────────────────────────────────────────
export const FormCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('panel-surface-strong p-6 max-w-2xl', className)}>
        {children}
    </div>
);

// ── StatusBadge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-900 border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300',
    Inactive: 'bg-slate-100 text-slate-800 border-slate-300/80 dark:bg-slate-900/70 dark:text-slate-300',
    Pending: 'bg-amber-100 text-amber-900 border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-300',
    Approved: 'bg-emerald-100 text-emerald-900 border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300',
    Rejected: 'bg-red-100 text-red-900 border-red-300/80 dark:bg-red-950/60 dark:text-red-300',
    Billed: 'bg-blue-100 text-blue-900 border-blue-300/80 dark:bg-blue-950/60 dark:text-blue-300',
    Delivered: 'bg-violet-100 text-violet-900 border-violet-300/80 dark:bg-violet-950/60 dark:text-violet-300',
    Completed: 'bg-emerald-100 text-emerald-900 border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300',
    Paid: 'bg-emerald-100 text-emerald-900 border-emerald-300/80',
    Unpaid: 'bg-red-100 text-red-900 border-red-300/80',
    Cleared: 'bg-emerald-100 text-emerald-900 border-emerald-300/80',
    Bounced: 'bg-red-100 text-red-900 border-red-300/80',
    Received: 'bg-emerald-100 text-emerald-900 border-emerald-300/80',
    'Not Received': 'bg-amber-100 text-amber-900 border-amber-300/80',
    Credited: 'bg-blue-100 text-blue-900 border-blue-300/80',
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
export const IconBtn = React.forwardRef<HTMLButtonElement, {
    onClick?: () => void;
    title?: string;
    children: React.ReactNode;
    danger?: boolean;
    className?: string;
    disabled?: boolean;
}>(({
    onClick, title, children, danger, className, disabled
}, ref) => (
    <button
        ref={ref}
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        disabled={disabled}
        className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            danger
                ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:hover:text-muted-foreground disabled:hover:bg-transparent'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/8 disabled:opacity-50 disabled:hover:text-muted-foreground disabled:hover:bg-transparent',
            className
        )}
    >
        {children}
    </button>
));
IconBtn.displayName = 'IconBtn';

interface TablePaginationProps {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    itemLabel?: string;
}
export const TablePagination = ({
    totalItems,
    currentPage,
    pageSize,
    onPageChange,
    itemLabel = 'records',
}: TablePaginationProps) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(totalItems, currentPage * pageSize);
    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= totalPages;

    return (
        <div className="flex flex-col gap-2 border-t border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{start}-{end}</span> of{' '}
                <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
            </p>
            <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={isFirstPage}
                    className="h-7 gap-1 px-2 text-xs"
                >
                    <ChevronLeft size={13} />
                    Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                    Page <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={isLastPage}
                    className="h-7 gap-1 px-2 text-xs"
                >
                    Next
                    <ChevronRight size={13} />
                </Button>
            </div>
        </div>
    );
};
