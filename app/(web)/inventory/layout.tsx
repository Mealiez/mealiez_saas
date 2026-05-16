import InventorySidebar from '@/components/inventory/InventorySidebar'

export default function InventoryLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      <InventorySidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/30">
        <div className="p-8 h-full">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
