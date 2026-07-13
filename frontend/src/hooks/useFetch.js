import { useCallback, useEffect, useRef, useState } from 'react';
import api, { unwrap, unwrapMeta } from '../services/api';
import { cleanParams, getApiError } from '../utils/helpers';

/**
 * Generic GET hook for the backend envelope { success, data, meta }.
 *
 *   const { data, meta, loading, error, refetch } = useFetch('/api/students/', { params });
 */
export default function useFetch(url, { params, skip = false } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const paramsKey = JSON.stringify(params || {});

  const refetch = useCallback(async () => {
    if (!url || skip) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(url, { params: cleanParams(JSON.parse(paramsKey)) });
      if (id === requestId.current) {
        setData(unwrap(res));
        setMeta(unwrapMeta(res) || null);
      }
    } catch (err) {
      if (id === requestId.current) setError(getApiError(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [url, paramsKey, skip]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, meta, loading, error, refetch };
}
