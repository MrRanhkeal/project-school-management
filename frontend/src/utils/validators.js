const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const required =
  (msg = 'This field is required') =>
  (value) =>
    value === undefined || value === null || String(value).trim() === '' ? msg : '';

export const email =
  (msg = 'Enter a valid email address') =>
  (value) =>
    value && !EMAIL_RE.test(value) ? msg : '';

export const minLength =
  (n, msg) =>
  (value) =>
    value && String(value).length < n ? msg || `Must be at least ${n} characters` : '';

export const maxLength =
  (n, msg) =>
  (value) =>
    value && String(value).length > n ? msg || `Must be at most ${n} characters` : '';

export const isDate =
  (msg = 'Use the YYYY-MM-DD format') =>
  (value) =>
    value && !DATE_RE.test(value) ? msg : '';

export const isNumber =
  (msg = 'Must be a number') =>
  (value) =>
    value !== '' && value !== undefined && Number.isNaN(Number(value)) ? msg : '';

/** Run validators in order; return the first error. */
export const compose =
  (...fns) =>
  (value, values) => {
    for (const fn of fns) {
      const err = fn(value, values);
      if (err) return err;
    }
    return '';
  };
