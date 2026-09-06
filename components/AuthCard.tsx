import type { ReactNode } from 'react';

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  accent = 'ink',
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent?: 'ink' | 'brass';
  children: ReactNode;
}) {
  const accentColor = accent === 'brass' ? 'var(--brass)' : 'var(--stamp)';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div
          style={{
            border: '1px solid var(--ink)',
            background: 'var(--paper-dim)',
            padding: '28px 28px 24px',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '12px',
              color: accentColor,
              letterSpacing: '0.02em',
            }}
          >
            {eyebrow}
          </p>
          <h1 style={{ fontSize: '26px', marginBottom: '8px' }}>{title}</h1>
          <p style={{ margin: '0 0 24px', color: 'var(--ink-soft)', fontSize: '14px' }}>
            {subtitle}
          </p>

          {/* Perforation — the one structural device, standing in for a torn stub edge */}
          <div
            aria-hidden="true"
            style={{
              borderTop: '1px dashed var(--ink-soft)',
              margin: '0 0 24px',
            }}
          />

          {children}
        </div>
      </div>
    </main>
  );
}
