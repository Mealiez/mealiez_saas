import { requireAuth } from '@/lib/auth/session'
import Sidebar from '@/components/web/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function WebLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  // Fetch tenant feature flags
  const supabase = await createClient()
  const { data: features } = await supabase
    .from('tenant_features')
    .select('feature_key, is_enabled')
    .eq('tenant_id', user.tenant_id)

  const enabledFeatures = (features ?? [])
    .filter(f => f.is_enabled)
    .map(f => f.feature_key)

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* SIDEBAR (Client Component) */}
      <Sidebar 
        user={{ full_name: user.full_name, role: user.role }} 
        enabledFeatures={enabledFeatures}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0">
          <div className="max-w-7xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img src="/logo.png" alt="Mealiez" className="h-7 w-auto" />
              <div className="h-8 w-px bg-gray-100 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Active Workspace
                </span>
                <span className="text-xs font-bold text-slate-900">
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
          </div>
        </header>

        {/* MAIN PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth h-full">
          {children}
        </main>
      </div>
    </div>
  )
}
