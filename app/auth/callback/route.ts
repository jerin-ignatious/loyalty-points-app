import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  // Preserve context on failure — a staff attempt should bounce back to
  // staff login, not silently land on the customer login page.
  const fallbackLogin = next.startsWith('/staff') ? '/staff/login' : '/login';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('exchangeCodeForSession failed:', error.message);
      return NextResponse.redirect(`${origin}${fallbackLogin}?error=auth_failed`);
    }

    if (data.user) {
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
            console.error('Failed to create customer row:', insertError.message);
            return NextResponse.redirect(`${origin}${fallbackLogin}?error=account_setup_failed`);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${fallbackLogin}?error=auth_failed`);
}