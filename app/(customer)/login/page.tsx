import { AuthCard } from '@/components/AuthCard';
import { LoginForm } from '@/components/LoginForm';

// Skip static prerendering — this page is a pure client-side form with
// no static content, and prerendering it at build time is what triggers
// the "URL and API key are required" error.
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
    </AuthCard>
  );
}