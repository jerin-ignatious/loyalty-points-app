import { createClient } from '@/lib/supabase/server';

export default async function StaffCustomersPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, points_balance')
    .order('name', { ascending: true });

  return (
    <div>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>Customers</h1>
      {!customers || customers.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>No customers yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ink)' }}>
              <th style={{ textAlign: 'left', padding: '8px 4px' }}>Name</th>
              <th style={{ textAlign: 'right', padding: '8px 4px' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px dashed var(--ink-soft)' }}>
                <td style={{ padding: '8px 4px' }}>{c.name}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>{c.points_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}