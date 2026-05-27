/**
 * Shared utility functions and constants for the ERP system.
 * Centralised here to avoid copy-pasting across page files.
 */
import type { PaymentModeEnum } from '@/app/types/database';
import { formatMoney, formatMoneyCompact } from '@/app/money';

// ── Currency formatters ────────────────────────────────────────────────────

/**
 * Default Indian-locale currency formatter. Shows paise (2 decimals) — this
 * is the right default for billing / receipts / customer-facing values.
 */
export const fmt = (n: number) => formatMoney(n);

/** Compact currency string — uses K/L abbreviations for large amounts. */
export const fmtK = (n: number) => formatMoneyCompact(n);

// ── Order status → Tailwind badge classes ─────────────────────────────────

export const STATUS_COLOR: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Advance: 'bg-red-100 text-red-700',
    Billed: 'bg-teal-100 text-teal-700',
    Delivered: 'bg-purple-100 text-purple-700',
};

/** Order/bill status → left-stripe Tailwind class for list rows. */
export const STATUS_STRIPE: Record<string, string> = {
    Pending:   'bg-amber-400',
    Approved:  'bg-emerald-500',
    Billed:    'bg-blue-500',
    Delivered: 'bg-violet-500',
    Rejected:  'bg-rose-500',
    Voided:    'bg-slate-400',
};

/** Payment-mode → badge color. Used in receipt + collection lists. */
export const MODE_COLORS: Record<PaymentModeEnum | string, string> = {
    Cash: 'bg-emerald-100 text-emerald-700',
    Cheque: 'bg-blue-100 text-blue-700',
    UPI: 'bg-purple-100 text-purple-700',
    'Bank Transfer': 'bg-teal-100 text-teal-700',
};

// ── Receipt status helpers ────────────────────────────────────────────────

export const DEFAULT_RECEIPT_STATUS = 'Not Collected' as const;

export const RECEIPT_COLLECTED_STATUSES = ['Received', 'Credited', 'Cleared'] as const;
export const VOIDED_RECEIPT_STATUS = 'Voided' as const;

export const RECEIPT_STATUS_OPTIONS_BY_MODE: Record<PaymentModeEnum, string[]> = {
    Cash: [DEFAULT_RECEIPT_STATUS, 'Received', 'Not Received'],
    Cheque: [DEFAULT_RECEIPT_STATUS, 'Cleared', 'Bounced'],
    'Bank Transfer': [DEFAULT_RECEIPT_STATUS, 'Credited'],
    UPI: [DEFAULT_RECEIPT_STATUS, 'Received'],
};

export const isCollectedReceiptStatus = (status: string | null | undefined): boolean =>
    status != null && RECEIPT_COLLECTED_STATUSES.includes(status as (typeof RECEIPT_COLLECTED_STATUSES)[number]);

export const isVoidedReceiptStatus = (status: string | null | undefined): boolean =>
    status === VOIDED_RECEIPT_STATUS;

// ── PostgREST LIKE escape ───────────────────────────────────────────────

/**
 * Escapes a user-supplied search term for safe use in PostgREST `.ilike()` /
 * `.or()` filters. PostgREST splits the `.or(...)` argument on commas, dots,
 * and parens, so untrusted characters can break out of the value and inject
 * additional filter clauses. We also escape SQL LIKE metacharacters (`%`, `_`)
 * and the escape char itself (`\`) so that callers can pass the result inside
 * `%...%` without unintended wildcards.
 *
 * Length is capped (default 100) to avoid pathological queries.
 */
export const escapePostgrestLike = (value: string, maxLength = 100): string => {
    const sliced = String(value ?? '').slice(0, maxLength);
    // Strip PostgREST filter delimiters that have no place in a LIKE value.
    const stripped = sliced.replace(/[,()*]/g, '');
    // Escape LIKE metacharacters.
    return stripped.replace(/[\\%_]/g, (m) => `\\${m}`);
};

// ── Email validation ────────────────────────────────────────────────────

/** Validates email format using RFC 5322 simplified regex */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

// ── Location constants ──────────────────────────────────────────────────

/**
 * Deprecated static location list.
 * Use settings-driven master data loaders instead.
 */
export const LOCATIONS: readonly string[] = [];
export type Location = string;

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
    // Prepend UTF-8 BOM so Excel renders ₹/non-ASCII names correctly.
    const blob = new Blob(['﻿', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
