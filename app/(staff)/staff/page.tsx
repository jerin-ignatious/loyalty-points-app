import Link from 'next/link';

export default function StaffDashboardPage() {
  return (
    <main style={{ padding: '32px', maxWidth: '420px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', marginBottom: '16px' }}>Staff counter</h1>
      <Link
        href="/staff/scan"
        style={{
          display: 'inline-block',
          padding: '11px 20px',
          border: '1px solid var(--ink)',
          background: 'var(--brass)',
          color: 'var(--paper)',
          fontSize: '14px',
        }}
      >
        Scan a customer
      </Link>
    </main>
  );
}