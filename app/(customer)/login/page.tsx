import { AuthCard } from '@/components/AuthCard';
import { LoginForm } from '@/components/LoginForm';

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
