import InventorySidebar from '@/components/inventory/InventorySidebar'
import { Construction, Info } from 'lucide-react'

export default function InventoryLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      <InventorySidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/30 relative">
        {/* Floating Under Development Dialog */}
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white/80 backdrop-blur-xl border border-amber-200 shadow-2xl rounded-2xl p-4 max-w-[280px] flex items-start gap-4">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                 <Construction size={20} />
              </div>
              <div>
                 <p className="text-xs font-black text-amber-900 uppercase tracking-tighter mb-1">Under Development</p>
                 <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                    This module is not built completely. Some features may be unstable or missing.
                 </p>
              </div>
           </div>
        </div>

        <div className="p-8 h-full">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
