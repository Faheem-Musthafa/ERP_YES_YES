/**
 * Date helpers for the ERP. Centralises timezone-correct conversions and
 * range/future validations so individual pages no longer reinvent them.
 *
 * Browser local timezone is treated as the source of truth for "today" in
 * UI flows (sales user creating an order in IST). Persistence and Supabase
 * date-range queries use the helpers in this module to translate local
 * calendar days to the correct UTC ISO instants.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` in the browser's local timezone (NOT UTC). */
export const todayLocalISO = (date: Date = new Date()): string => {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

/**
 * Parse a `YYYY-MM-DD` string as a local-midnight Date. Avoids the
 * `new Date("2026-05-11")` pitfall, which parses as UTC midnight and
 * shifts back to the previous local day east of UTC.
 */
export const parseLocalDate = (yyyyMmDd: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd ?? '');
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
};

/**
 * Translate a single local calendar day (`YYYY-MM-DD`) into a half-open
 * UTC ISO range `[gte, lt)` suitable for Supabase `.gte(col, gte).lt(col, lt)`.
 */
export const localDateToUTCDayRange = (
    yyyyMmDd: string,
): { gte: string; lt: string } | null => {
    const start = parseLocalDate(yyyyMmDd);
    if (!start) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start.toISOString(), lt: end.toISOString() };
};

/**
 * Translate a local date range (`from`..`to` inclusive) into a half-open
 * UTC ISO range. If either bound is missing, the corresponding side is
 * unbounded (null).
 */
export const localRangeToUTC = (
    fromYmd?: string | null,
    toYmd?: string | null,
): { gte: string | null; lt: string | null } => {
    const fromStart = fromYmd ? parseLocalDate(fromYmd) : null;
    const toStart = toYmd ? parseLocalDate(toYmd) : null;
    const lt = toStart ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000) : null;
    return {
        gte: fromStart ? fromStart.toISOString() : null,
        lt: lt ? lt.toISOString() : null,
    };
};

/** Display in `dd MMM yyyy` Indian locale, or em-dash for null/empty. */
export const formatDateIN = (value: string | Date | null | undefined): string => {
    if (value == null || value === '') return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Display in `dd MMM yyyy, hh:mm a` Indian locale. */
export const formatDateTimeIN = (value: string | Date | null | undefined): string => {
    if (value == null || value === '') return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
};

/** True if the given `YYYY-MM-DD` falls after today (local). */
export const isFutureDate = (yyyyMmDd: string): boolean => {
    const parsed = parseLocalDate(yyyyMmDd);
    if (!parsed) return false;
    const today = parseLocalDate(todayLocalISO());
    return today != null && parsed.getTime() > today.getTime();
};

/** Throws if the given date is in the future. */
export const validateDateNotInFuture = (yyyyMmDd: string, label: string): void => {
    if (!yyyyMmDd) return;
    if (isFutureDate(yyyyMmDd)) {
        throw new Error(`${label} cannot be a future date`);
    }
};

/** Throws if `from > to`. Empty values are skipped (caller decides required-ness). */
export const validateDateRange = (
    fromYmd: string | null | undefined,
    toYmd: string | null | undefined,
): void => {
    if (!fromYmd || !toYmd) return;
    const from = parseLocalDate(fromYmd);
    const to = parseLocalDate(toYmd);
    if (!from || !to) return;
    if (from.getTime() > to.getTime()) {
        throw new Error('"From" date cannot be after "To" date');
    }
};

/** Offset `YYYY-MM-DD` by N days, returning a new `YYYY-MM-DD`. */
export const addDaysISO = (yyyyMmDd: string, days: number): string => {
    const parsed = parseLocalDate(yyyyMmDd);
    if (!parsed) return yyyyMmDd;
    parsed.setDate(parsed.getDate() + days);
    return todayLocalISO(parsed);
};
