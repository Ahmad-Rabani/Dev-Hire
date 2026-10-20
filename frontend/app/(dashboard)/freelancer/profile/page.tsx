import { RequireAuth } from '@/features/auth/RequireAuth';
import { ProfileEditForm } from '@/features/profile/ProfileEditForm';

export const metadata = {
  title: 'My profile',
};

export default function FreelancerProfilePage() {
  return (
    <RequireAuth roles={['freelancer']}>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Freelancer profile</h1>
        <ProfileEditForm />
      </div>
    </RequireAuth>
  );
}
