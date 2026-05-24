import { getCurrentUser } from '@/lib/auth/session';
import AttendanceSidebar from './AttendanceSidebar';

export default async function AttendanceModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  return (
    <div className="flex h-screen bg-gray-50/30">
      <AttendanceSidebar userRole={user?.role || 'member'} />
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
