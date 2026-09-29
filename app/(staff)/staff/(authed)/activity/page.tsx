import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function StaffActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/staff/login');

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, points, note, created_at, customers(name)')
    .eq('staff_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>My activity</h1>
      {!transactions || transactions.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>
          Nothing recorded yet — transactions you process will show up here.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {transactions.map((tx: any) => (
            <li key={tx.id} style={{ padding: '10px 0', borderBottom: '1px dashed var(--ink-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px' }}>
                  {tx.customers?.name ?? 'Unknown customer'} — {tx.type}
                </span>
                <span style={{ fontSize: '14px', color: tx.points >= 0 ? 'var(--ink)' : 'var(--stamp)' }}>
                  {tx.points >= 0 ? '+' : ''}
                  {tx.points}
                </span>
              </div>
              {tx.note && (
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-soft)' }}>{tx.note}</p>
              )}
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--ink-soft)' }}>
                {new Date(tx.created_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}