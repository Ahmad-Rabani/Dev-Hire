import { AuthShell } from '@/features/auth/components/AuthShell';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata = {
  title: 'Sign up',
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join as a client or freelancer. Admin accounts are provisioned separately."
    >
      <RegisterForm />
    </AuthShell>
  );
}
