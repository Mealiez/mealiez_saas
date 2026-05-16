import InventorySidebar from '@/components/inventory/InventorySidebar'

export default function InventoryLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-[calc(100vh-8rem)] -m-8 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
      <InventorySidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/30">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
