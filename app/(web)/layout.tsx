import { requireAuth } from '@/lib/auth/session'
import Sidebar from '@/components/web/Sidebar'

export default async function WebLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">

      {/* SIDEBAR (Client Component) */}
      <Sidebar user={{ full_name: user.full_name, role: user.role }} />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col md:pl-64 h-full relative overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tight leading-none mb-0.5">
                Current Workspace
              </span>
              <span className="text-sm font-bold text-slate-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="px-4 py-1.5 bg-slate-100/80 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
                  ID: {user.tenant_id.slice(0, 8)}
                </span>
             </div>
          </div>
        </header>

        {/* MAIN PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  )
}
