import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles the redirect back from Supabase after either:
 * - an email magic-link click, or
 * - a completed Google OAuth flow.
 * Both use the PKCE `code` param under the hood — one handler covers both.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing or invalid code — send back to a login page with an error flag
  // rather than silently landing somewhere unexpected.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
