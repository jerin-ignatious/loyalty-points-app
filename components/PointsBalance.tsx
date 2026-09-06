'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PointsBalance({
  customerId,
  initialBalance,
}: {
  customerId: string;
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`customer-balance-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customerId}`,
        },
        (payload) => {
          setBalance(payload.new.points_balance as number);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--ink-soft)' }}>
        Points balance
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-display), serif',
          fontSize: '48px',
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        {balance}
      </p>
    </div>
  );
}