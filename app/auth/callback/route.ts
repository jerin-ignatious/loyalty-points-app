import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (!next.startsWith('/staff')) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingCustomer) {
          const fallbackName =
            data.user.user_metadata?.full_name ??
            data.user.email?.split('@')[0] ??
            'Customer';

          const { error: insertError } = await supabase.from('customers').insert({
            id: data.user.id,
            name: fallbackName,
            email: data.user.email,
          });

          if (insertError) {
            // Don't silently continue to a page that expects a customer row
            // to exist — surface this so it's actually debuggable.
            console.error('Failed to create customer row:', insertError.message);
            return NextResponse.redirect(
              `${origin}/login?error=account_setup_failed`
            );
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}