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
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {customers.map((c) => (
            <li
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px dashed var(--ink-soft)',
              }}
            >
              <span style={{ fontSize: '14px' }}>{c.name}</span>
              <span style={{ fontSize: '15px', fontWeight: 500 }}>{c.points_balance}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}