import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import MemberMealRequests from './MemberMealRequests';

export default async function MealRequestsPage() {
  const user = await requireAuth();

  // If Manager+, redirect to the dashboard
  if (['admin', 'manager'].includes(user.role)) {
    redirect('/meal-requests/dashboard');
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Meal Requests</h1>
          <p className="text-gray-500 font-medium mt-1">
            Reserve your meals in advance to help us prepare better.
          </p>
        </div>
      </div>

      <MemberMealRequests />
    </div>
  );
}
