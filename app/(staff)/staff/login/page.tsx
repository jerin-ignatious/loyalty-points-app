import { AuthCard } from '@/components/AuthCard';
import { LoginForm } from '@/components/LoginForm';

// Skip static prerendering — this page is a pure client-side form with
// no static content, and prerendering it at build time is what triggers
// the "URL and API key are required" error.
export const dynamic = 'force-dynamic';

export default function StaffLoginPage() {
  return (
    <AuthCard
      eyebrow="Staff counter"
      title="Staff sign-in"
      subtitle="Scan customer codes and record points at checkout."
      accent="brass"
    >
      <LoginForm next="/staff" accent="brass" />
    </AuthCard>
  );
}