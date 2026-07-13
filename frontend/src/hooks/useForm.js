import { useCallback, useState } from 'react';

/**
 * Small controlled-form helper.
 *
 *   const { values, errors, handleChange, validate, reset } = useForm(
 *     { email: '' },
 *     { email: compose(required(), email()) }
 *   );
 */
export default function useForm(initialValues = {}, validators = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const next = type === 'checkbox' ? checked : value;
    setValues((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  }, []);

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const validate = useCallback(() => {
    const nextErrors = {};
    for (const [name, fn] of Object.entries(validators)) {
      const err = fn(values[name], values);
      if (err) nextErrors[name] = err;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [values, validators]);

  const reset = useCallback(
    (next) => {
      setValues(next || initialValues);
      setErrors({});
    },
    [initialValues]
  );

  return { values, errors, handleChange, setValue, setValues, validate, reset };
}
