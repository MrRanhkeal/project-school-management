import dayjs from 'dayjs';

/** Remove empty-string / null / undefined entries so they don't hit zod validators. */
export function cleanParams(obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}

export function formatDate(value, fmt = 'YYYY-MM-DD') {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(fmt) : '—';
}

export function formatDateTime(value) {
  return formatDate(value, 'YYYY-MM-DD HH:mm');
}

/**
 * Money for display.
 *
 * MySQL DECIMAL columns come back from the driver as STRINGS ("120.00"), not
 * numbers, so anything doing arithmetic or `.toFixed()` on a raw `price` /
 * `amount` field breaks. Always coerce first — that is what this does.
 */
export function formatMoney(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fullName(row = {}) {
  return [row.firstName, row.lastName].filter(Boolean).join(' ') || row.fullName || '—';
}

export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function capitalize(s = '') {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replaceAll('_', ' ') : s;
}

/** Extract a human message from an axios error (backend envelope: { success:false, error:{ message } }). */
export function getApiError(err) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    'Something went wrong'
  );
}

/**
 * Academic year in the backend's "YYYY-YYYY" format, assuming the school year
 * starts in August. In July 2026 that is "2025-2026"; in September 2026 it is
 * "2026-2027".
 */
export function currentAcademicYear(date = new Date()) {
  const d = dayjs(date);
  const start = d.month() >= 7 ? d.year() : d.year() - 1; // dayjs months are 0-based
  return `${start}-${start + 1}`;
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
