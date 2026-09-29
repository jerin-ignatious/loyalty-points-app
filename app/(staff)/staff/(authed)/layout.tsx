import Link from 'next/link';

export default function StaffAuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav
        style={{
          borderBottom: '1px solid var(--ink)',
          padding: '14px 20px',
          display: 'flex',
          gap: '18px',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--brass)', marginRight: 'auto' }}>
          Staff counter
        </span>
        <Link href="/staff/scan" style={{ fontSize: '14px' }}>
          Scan
        </Link>
        <Link href="/staff/customers" style={{ fontSize: '14px' }}>
          Customers
        </Link>
        <Link href="/staff/activity" style={{ fontSize: '14px' }}>
          My activity
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            style={{
              fontSize: '13px',
              border: '1px solid var(--ink)',
              background: 'transparent',
              padding: '6px 10px',
            }}
          >
            Sign out
          </button>
        </form>
      </nav>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}