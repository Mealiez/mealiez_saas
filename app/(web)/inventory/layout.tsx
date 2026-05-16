import InventorySidebar from '@/components/inventory/InventorySidebar'

export default function InventoryLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-64 top-16 bg-white flex z-10">
      <InventorySidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/30">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
