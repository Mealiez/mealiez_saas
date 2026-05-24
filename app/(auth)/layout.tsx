export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 
                    flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        {children}
      </div>
    </div>
  )
}
