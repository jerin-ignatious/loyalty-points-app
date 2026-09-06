'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({
  next,
  accent = 'ink',
}: {
  /** Path to land on after auth completes, e.g. "/" or "/staff" */
  next: string;
  accent?: 'ink' | 'brass';
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
  const accentColor = accent === 'brass' ? 'var(--brass)' : 'var(--stamp)';

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setErrorMessage('Enter your email first');
      return;
    }
    setStatus('loading');
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }
    setStatus('sent');
  }

  async function handleGoogleSignIn() {
    setStatus('loading');
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    }
    // On success, the browser is redirected away — no further state change needed here.
  }

  if (status === 'sent') {
    return (
      <p style={{ margin: 0, fontSize: '14px' }}>
        Link sent to <strong style={{ fontWeight: 500 }}>{email}</strong> — check your
        inbox to finish signing in.
      </p>
    );
  }

  return (
    <div>
      <form onSubmit={handleEmailSubmit}>
        <label htmlFor="email" style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          style={{
            width: '100%',
            padding: '10px 12px',
            marginBottom: '12px',
            border: '1px solid var(--ink)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontFamily: 'inherit',
            fontSize: '14px',
          }}
        />

        {status === 'error' && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', margin: '0 0 12px' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            width: '100%',
            padding: '11px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: accentColor,
            color: 'var(--paper)',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '12px',
            opacity: status === 'loading' ? 0.6 : 1,
          }}
        >
          {status === 'loading' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 16px' }}>
        <div style={{ flex: 1, borderTop: '1px solid var(--ink-soft)', opacity: 0.4 }} />
        <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>or</span>
        <div style={{ flex: 1, borderTop: '1px solid var(--ink-soft)', opacity: 0.4 }} />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={status === 'loading'}
        style={{
          width: '100%',
          padding: '11px',
          border: '1px solid var(--ink)',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          color: 'var(--ink)',
          fontSize: '14px',
          opacity: status === 'loading' ? 0.6 : 1,
        }}
      >
        Continue with Google
      </button>
    </div>
  );
}
