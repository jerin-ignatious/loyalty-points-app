import { AuthCard } from '@/components/AuthCard';
import { LoginForm } from '@/components/LoginForm';

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
