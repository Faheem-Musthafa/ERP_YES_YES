/**
 * Shared utility functions and constants for the ERP system.
 * Centralised here to avoid copy-pasting across page files.
 */

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
