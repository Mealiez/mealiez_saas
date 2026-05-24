import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BranchManagementContent from './BranchManagementContent';

export default async function BranchManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile to check role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 mt-2">Only administrators can access this module.</p>
      </div>
    );
  }

  return <BranchManagementContent />;
}
