import AttendanceSidebar from './AttendanceSidebar';

export default function AttendanceModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50/30">
      <AttendanceSidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
