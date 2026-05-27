import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import MealTimeSettings from './MealTimeSettings';
import TimezoneSettings from './TimezoneSettings';
import DesignationSettings from './DesignationSettings';
import { checkFeatureEnabled } from '@/lib/features/gate';

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { section?: string }
}) {
  const user = await requireAuth();

  // 1. Feature Flag Check
  const isSettingsEnabled = await checkFeatureEnabled(user.tenant_id, 'settings_module');
  if (!isSettingsEnabled) {
    return (
      <div className="p-8 text-center h-[50vh] flex flex-col items-center justify-center font-sans">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6">
           <span className="text-4xl font-bold">!</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Feature Disabled</h1>
        <p className="text-gray-500 font-medium mt-2 max-w-sm">The settings module is not enabled for your mess. Please contact your system provider.</p>
      </div>
    );
  }

  const section = searchParams.section || 'timezone';

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      <header>
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-600 mb-2">
           <span className="w-8 h-[2px] bg-blue-600"></span>
           Mess Configuration
        </div>
        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">
          {section === 'timezone' && 'Clock Sync'}
          {section === 'meal-time' && 'Session Timings'}
          {section === 'designations' && 'Team Roles'}
        </h1>
        <p className="text-gray-500 font-medium mt-2">
          {section === 'timezone' && 'Ensure all bookings and automation use your local time.'}
          {section === 'meal-time' && 'Configure the active windows for meal check-ins.'}
          {section === 'designations' && 'Manage job titles and official roles for your staff.'}
        </p>
      </header>

      <div className="space-y-12">
        {section === 'timezone' && (
          <section>
             <TimezoneSettings />
          </section>
        )}

        {section === 'meal-time' && (
          <section>
             <MealTimeSettings />
          </section>
        )}

        {section === 'designations' && (
          <section>
             <DesignationSettings />
          </section>
        )}
      </div>
    </div>
  );
}
