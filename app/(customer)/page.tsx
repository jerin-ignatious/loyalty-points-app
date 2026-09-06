import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { PointsBalance } from '@/components/PointsBalance';
import { TransactionHistory } from '@/components/TransactionHistory';

export default async function CustomerHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route, but guard again here in case
  // this page is ever reached another way.
  if (!user) {
    redirect('/login');
  }

  let { data: customer } = await supabase
    .from('customers')
    .select('id, name, qr_token, points_balance')
    .eq('id', user.id)
    .single();

  // No customer row yet — self-heal instead of redirecting. (Redirecting to
  // /login here caused a loop: middleware bounces an already-authenticated
  // user straight back out of /login to "/", which lands here again.)
  if (!customer) {
    const fallbackName =
      user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Customer';

    const { data: created, error: insertError } = await supabase
      .from('customers')
      .insert({ id: user.id, name: fallbackName, email: user.email })
      .select('id, name, qr_token, points_balance')
      .single();

    if (insertError || !created) {
      return (
        <main style={{ padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '20px' }}>Couldn&apos;t set up your account</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>
            Something went wrong creating your loyalty card. Try refreshing, or
            ask the shop for help if this keeps happening.
          </p>
        </main>
      );
    }

    customer = created;
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, points, note, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main style={{ padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--stamp)' }}>
        Loyalty card
      </p>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>Hi, {customer.name}</h1>

      <PointsBalance customerId={customer.id} initialBalance={customer.points_balance} />

      <div style={{ margin: '24px 0', display: 'flex', justifyContent: 'center' }}>
        <QRCodeDisplay qrToken={customer.qr_token} />
      </div>
      <p
        style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--ink-soft)',
          margin: '0 0 32px',
        }}
      >
        Show this at checkout
      </p>

      <div
        aria-hidden="true"
        style={{ borderTop: '1px dashed var(--ink-soft)', margin: '0 0 20px' }}
      />

      <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Activity</h2>
      <TransactionHistory
        transactions={(transactions ?? []).map((tx) => ({
          id: tx.id,
          type: tx.type,
          points: tx.points,
          note: tx.note,
          createdAt: tx.created_at,
        }))}
      />
    </main>
  );
}