import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components (browser).
 * Call this inside components, not at module scope, so it
 * always reads the current cookies/session.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}