import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
        },
      })
    : null;


console.log('[AUTH] Supabase client config', {
  configured: Boolean(supabase),
  persistSession: true,
  autoRefreshToken: true,
  flowType: 'pkce',
  detectSessionInUrl: false,
});

