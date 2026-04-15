import { createBrowserClient } from '@supabase/ssr';

// Use the SSR-aware browser client so the session is stored in cookies that
// the server-side API routes (createSupabaseServer, middleware) can read.
// Using plain @supabase/supabase-js here would stash the session in
// localStorage only, leaving server routes returning 401 Unauthorized.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
