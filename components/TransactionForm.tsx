'use client';

import { useState } from 'react';

type TxType = 'earn' | 'redeem' | 'adjustment';

interface Customer {
  id: string;
  name: string;
  pointsBalance: number;
}

export function TransactionForm({
  customer,
  onSubmitted,
  onCancel,
}: {
  customer: Customer;
  onSubmitted: (newBalance: number) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TxType>('earn');
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const noteRequired = type !== 'earn';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const pointsNum = Number(points);
    if (!points || !Number.isInteger(pointsNum) || pointsNum <= 0) {
      setError('Enter a whole number of points greater than 0');
      return;
    }
    if (noteRequired && !note.trim()) {
      setError(`A note is required for ${type}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          type,
          points: pointsNum,
          note: noteRequired ? note.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }

      onSubmitted(data.newBalance);
    } catch {
      setError('Network error — try again');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--ink-soft)' }}>
        {customer.name} — current balance {customer.pointsBalance}
      </p>

      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        {(['earn', 'redeem', 'adjustment'] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid var(--ink)',
              background: type === t ? 'var(--brass)' : 'transparent',
              color: type === t ? 'var(--paper)' : 'var(--ink)',
              fontSize: '13px',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <label htmlFor="points" style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>
        Points
      </label>
      <input
        id="points"
        type="number"
        inputMode="numeric"
        min={1}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          marginBottom: '12px',
          border: '1px solid var(--ink)',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontFamily: 'inherit',
          fontSize: '14px',
        }}
      />

      <label htmlFor="note" style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>
        Note {noteRequired ? '(required)' : '(optional)'}
      </label>
      <input
        id="note"
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={type === 'redeem' ? 'e.g. Free coffee' : 'e.g. Corrected mis-typed amount'}
        style={{
          width: '100%',
          padding: '10px 12px',
          marginBottom: '12px',
          border: '1px solid var(--ink)',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontFamily: 'inherit',
          fontSize: '14px',
        }}
      />

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            flex: 1,
            padding: '11px',
            border: '1px solid var(--ink)',
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: '14px',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            flex: 2,
            padding: '11px',
            border: 'none',
            background: 'var(--brass)',
            color: 'var(--paper)',
            fontSize: '14px',
            fontWeight: 500,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </form>
  );
}