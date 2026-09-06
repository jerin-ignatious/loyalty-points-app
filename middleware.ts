import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh the session if it's expired — required for Server Components
  // to see an up-to-date session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthCallback = path.startsWith('/auth/');
  const isStaffRoute = path.startsWith('/staff') && path !== '/staff/login';
  const isCustomerLogin = path === '/login';
  const isStaffLogin = path === '/staff/login';
  // Anything else (customer-facing pages, e.g. "/") requires a customer session.
  const isCustomerRoute = !isAuthCallback && !isStaffRoute && !isCustomerLogin && !isStaffLogin;

  // Not logged in and hitting a protected route -> bounce to the right login page.
  if (!user && isStaffRoute) {
    return NextResponse.redirect(new URL('/staff/login', request.url));
  }
  if (!user && isCustomerRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged in and staff -> confirm staff row exists before letting them
  // reach staff pages. (Customer-vs-staff distinction, not a role tier —
  // see docs/lld.md Section 3.2.)
  if (user && isStaffRoute) {
    const { data: staffRow } = await supabase
      .from('staff')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!staffRow) {
      // Authenticated, but not a staff member — send them to the customer area.
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Already logged in and visiting a login page -> skip straight past it.
  if (user && (isCustomerLogin || isStaffLogin)) {
    const destination = isStaffLogin ? '/staff' : '/';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization,
     * so the session cookie stays fresh across the whole app.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)',
  ],
};
