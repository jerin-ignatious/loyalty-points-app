'use client';

import { useState } from 'react';
import { QRScanner } from '@/components/QRScanner';
import { TransactionForm } from '@/components/TransactionForm';

interface Customer {
  id: string;
  name: string;
  pointsBalance: number;
}

type Phase =
  | { step: 'scan' }
  | { step: 'lookup' }
  | { step: 'ready'; customer: Customer }
  | { step: 'result'; customerName: string; newBalance: number }
  | { step: 'error'; message: string };

export default function StaffScanPage() {
  const [phase, setPhase] = useState<Phase>({ step: 'scan' });
  const [scanKey, setScanKey] = useState(0);

  async function handleScan(qrToken: string) {
    setPhase({ step: 'lookup' });

    try {
      const res = await fetch(`/api/customers/by-token/${encodeURIComponent(qrToken)}`);
      const data = await res.json();

      if (!res.ok) {
        setPhase({
          step: 'error',
          message:
            res.status === 404
              ? "Customer not found — ask them to check they're logged into their account"
              : data.error ?? 'Something went wrong',
        });
        return;
      }

      setPhase({ step: 'ready', customer: data });
    } catch {
      setPhase({ step: 'error', message: 'Network error — try again' });
    }
  }

  function scanNext() {
    setScanKey((k) => k + 1);
    setPhase({ step: 'scan' });
  }

  return (
    <main style={{ padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--brass)' }}>Staff counter</p>
      <h1 style={{ fontSize: '22px', marginBottom: '20px' }}>Scan customer</h1>

      {phase.step === 'scan' && (
        <>
          <QRScanner
            key={scanKey}
            onScan={handleScan}
            onError={(message) => setPhase({ step: 'error', message })}
          />
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--ink-soft)', marginTop: '12px' }}>
            Point the camera at the customer&apos;s QR code
          </p>
        </>
      )}

      {phase.step === 'lookup' && (
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>Looking up customer…</p>
      )}

      {phase.step === 'ready' && (
        <TransactionForm
          customer={phase.customer}
          onSubmitted={(newBalance) =>
            setPhase({ step: 'result', customerName: phase.customer.name, newBalance })
          }
          onCancel={scanNext}
        />
      )}

      {phase.step === 'result' && (
        <div>
          <p style={{ fontSize: '15px', margin: '0 0 4px' }}>
            Done — {phase.customerName}&apos;s new balance:
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: '40px',
              fontWeight: 600,
              margin: '0 0 20px',
            }}
          >
            {phase.newBalance}
          </p>
          <button
            onClick={scanNext}
            style={{
              width: '100%',
              padding: '11px',
              border: 'none',
              background: 'var(--brass)',
              color: 'var(--paper)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Scan next customer
          </button>
        </div>
      )}

      {phase.step === 'error' && (
        <div>
          <p style={{ color: 'var(--danger)', fontSize: '14px', margin: '0 0 16px' }}>
            {phase.message}
          </p>
          <button
            onClick={scanNext}
            style={{
              width: '100%',
              padding: '11px',
              border: '1px solid var(--ink)',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: '14px',
            }}
          >
            Try again
          </button>
        </div>
      )}
    </main>
  );
}