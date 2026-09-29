import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default function CustomerLoginPage() {
  return (
    <AuthCard
      eyebrow="Loyalty card"
      title="Sign in"
      subtitle="Track your points and show your code at checkout."
      accent="ink"
    >
      <LoginForm next="/" accent="ink" />
      <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '16px' }}>
        <Link href="/staff/login" style={{ color: 'var(--brass)' }}>
          Staff member? Sign in here
        </Link>
      </p>
    </AuthCard>
  );
}