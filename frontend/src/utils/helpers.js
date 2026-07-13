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

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
