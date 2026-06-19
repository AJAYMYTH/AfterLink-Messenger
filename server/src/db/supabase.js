import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

function isConfigured() {
  return config.supabase.url &&
    config.supabase.url !== 'https://placeholder.supabase.co' &&
    config.supabase.serviceKey &&
    config.supabase.serviceKey !== 'placeholder-service-key';
}

function createMockClient() {
  const chain = (result) => new Proxy(() => {}, {
    get(_, prop) {
      if (prop === 'then') return undefined;
      if (prop === 'select') return () => chain(result);
      if (prop === 'insert') return () => chain({ data: null, error: new Error('Supabase not configured') });
      if (prop === 'update') return () => chain({ data: null, error: new Error('Supabase not configured') });
      if (prop === 'delete') return () => chain({ data: null, error: null });
      if (prop === 'eq') return () => chain(result);
      if (prop === 'or') return () => chain(result);
      if (prop === 'in') return () => chain(result);
      if (prop === 'order') return () => chain(result);
      if (prop === 'limit') return () => chain(result);
      if (prop === 'single') return () => Promise.resolve(result);
      if (prop === 'maybeSingle') return () => Promise.resolve(result);
      if (prop === 'is') return () => chain(result);
      if (prop === 'textSearch') return () => chain(result);
      return () => Promise.resolve(result);
    },
    apply() { return chain(result); },
  });

  return {
    from: () => chain({ data: [], error: null }),
    storage: {
      from: () => ({
        createSignedUploadUrl: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      }),
    },
  };
}

let supabase = isConfigured() ? createClient(config.supabase.url, config.supabase.serviceKey) : createMockClient();

export default supabase;
