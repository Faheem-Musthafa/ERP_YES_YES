/**
 * Shared utility functions and constants for the ERP system.
 * Centralised here to avoid copy-pasting across page files.
 */
import type { PaymentModeEnum } from '@/app/types/database';

// ── Currency formatters ────────────────────────────────────────────────────

/** Full Indian-locale currency string, e.g. "₹ 1,25,000" */
export const fmt = (n: number) =>
    `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Compact currency string — uses K/L abbreviations for large amounts */
export const fmtK = (n: number) =>
    n >= 100000
        ? `₹ ${(n / 100000).toFixed(1)}L`
        : n >= 1000
            ? `₹ ${(n / 1000).toFixed(1)}K`
            : fmt(n);

// ── Order status → Tailwind badge classes ─────────────────────────────────

export const STATUS_COLOR: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Billed: 'bg-teal-100 text-teal-700',
    Delivered: 'bg-purple-100 text-purple-700',
};

// ── Receipt status helpers ────────────────────────────────────────────────

export const DEFAULT_RECEIPT_STATUS = 'Not Collected' as const;

export const RECEIPT_COLLECTED_STATUSES = ['Received', 'Credited', 'Cleared'] as const;

export const RECEIPT_STATUS_OPTIONS_BY_MODE: Record<PaymentModeEnum, string[]> = {
    Cash: [DEFAULT_RECEIPT_STATUS, 'Received', 'Not Received'],
    Cheque: [DEFAULT_RECEIPT_STATUS, 'Cleared', 'Bounced'],
    'Bank Transfer': [DEFAULT_RECEIPT_STATUS, 'Credited'],
    UPI: [DEFAULT_RECEIPT_STATUS, 'Received'],
};

export const isCollectedReceiptStatus = (status: string | null | undefined): boolean =>
    status != null && RECEIPT_COLLECTED_STATUSES.includes(status as (typeof RECEIPT_COLLECTED_STATUSES)[number]);

// ── Email validation ────────────────────────────────────────────────────

/** Validates email format using RFC 5322 simplified regex */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

// ── Location constants ──────────────────────────────────────────────────

/** Available warehouse/store locations */
export const LOCATIONS = ['Kottakkal', 'Chenakkal'] as const;
export type Location = typeof LOCATIONS[number];

// ── CSV Export ──────────────────────────────────────────────────────────────

/** Downloads an array of rows as a CSV file. */
export const downloadCSV = (
    headers: string[],
    rows: (string | number | null | undefined)[][],
    filename: string
) => {
    if (rows.length === 0) return;
    const escape = (v: string | number | null | undefined) => {
        const s = String(v ?? '');
        // Prevent CSV formula injection: prefix dangerous-start chars with a single quote
        const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
        return safe.includes(',') || safe.includes('"') || safe.includes('\n')
            ? `"${safe.replace(/"/g, '""')}"`
            : safe;
    };
    const csvContent = [
        headers.map(escape).join(','),
        ...rows.map(r => r.map(escape).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
