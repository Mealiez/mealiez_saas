import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import MealTimeConfig from './MealTimeConfig';

export default async function SettingsPage() {
  const user = await requireAuth();

  // ONLY ADMIN can access settings
  if (user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 uppercase tracking-tight">Access Denied</h1>
        <p className="text-gray-500 font-medium mt-2">Only administrators can access system settings.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">System Settings</h1>
        <p className="text-gray-500 font-medium mt-1">Manage global configurations and business rules.</p>
      </div>

      <div className="space-y-12">
        <section>
           <MealTimeConfig />
        </section>
        
        {/* Placeholder for future settings sections */}
        <section className="p-12 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center">
           <p className="text-gray-300 font-bold uppercase tracking-widest text-xs">More settings coming soon</p>
        </section>
      </div>
    </div>
  );
}
