import { createClient } from '@supabase/supabase-js';

// These are public browser credentials (project URL and publishable key).
// Deployment environments can override them through Vite variables.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ktreoegrykqxxqaqfcgk.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YH3k_jEqes_59VSJ7Oa1EA_UpTqstb1';

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
