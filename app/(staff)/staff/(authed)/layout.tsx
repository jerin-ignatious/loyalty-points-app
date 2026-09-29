'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/staff/scan', label: 'Scan' },
  { href: '/staff/customers', label: 'Customers' },
  { href: '/staff/activity', label: 'Activity' },
];

export default function StaffAuthedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--ink)',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--brass)' }}>Staff counter</span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            style={{
              fontSize: '12px',
              border: '1px solid var(--ink)',
              background: 'transparent',
              color: 'var(--ink)',
              padding: '5px 10px',
            }}
          >
            Sign out
          </button>
        </form>
      </header>

      <div
        style={{
          flex: 1,
          maxWidth: '420px',
          width: '100%',
          margin: '0 auto',
          padding: '20px',
          paddingBottom: '90px',
        }}
      >
        {children}
      </div>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          borderTop: '1px solid var(--ink)',
          background: 'var(--paper-dim)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '12px 0 10px',
                fontSize: '13px',
                color: active ? 'var(--brass)' : 'var(--ink)',
                borderTop: active ? '2px solid var(--brass)' : '2px solid transparent',
                marginTop: '-1px',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}