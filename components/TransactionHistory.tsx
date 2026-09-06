interface HistoryTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'adjustment';
  points: number;
  note: string | null;
  createdAt: string;
}

const typeLabel: Record<HistoryTransaction['type'], string> = {
  earn: 'Earned',
  redeem: 'Redeemed',
  adjustment: 'Adjusted',
};

export function TransactionHistory({ transactions }: { transactions: HistoryTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>
        No activity yet — your first stamp will show up here.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {transactions.map((tx) => (
        <li
          key={tx.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '10px 0',
            borderBottom: '1px dashed var(--ink-soft)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '14px' }}>{typeLabel[tx.type]}</p>
            {tx.note && (
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-soft)' }}>
                {tx.note}
              </p>
            )}
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--ink-soft)' }}>
              {new Date(tx.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              color: tx.points >= 0 ? 'var(--ink)' : 'var(--stamp)',
            }}
          >
            {tx.points >= 0 ? '+' : ''}
            {tx.points}
          </p>
        </li>
      ))}
    </ul>
  );
}