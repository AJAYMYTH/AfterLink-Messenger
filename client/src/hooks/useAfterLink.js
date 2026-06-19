import { useEffect, useState } from 'react';
import { request } from '../lib/afterlink.js';

export function useAfterLink(route, body, options = {}) {
  const { immediate = true, onSuccess, onError } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (overrideBody) => {
    setLoading(true);
    setError(null);
    try {
      const res = await request(route, overrideBody || body);
      if (res.ok) {
        setData(res.data);
        onSuccess?.(res.data);
      } else {
        setError(res.error);
        onError?.(res.error);
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { data, loading, error, execute };
}
