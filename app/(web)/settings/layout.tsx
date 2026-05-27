import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import SettingsSidebar from './SettingsSidebar';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // ONLY ADMIN can access settings
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50/50 font-sans">
      {/* SECONDARY SETTINGS SIDEBAR */}
      <SettingsSidebar />

      {/* MAIN SETTINGS CONTENT */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth p-8 font-sans">
        <div className="max-w-5xl mx-auto pb-20">
           {children}
        </div>
      </main>
    </div>
  );
}
