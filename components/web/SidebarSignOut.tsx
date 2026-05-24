"use client"

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SidebarSignOut({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      title={isCollapsed ? "Sign out" : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 group",
        isCollapsed && "justify-center px-2"
      )}
    >
      <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      {!isCollapsed && (
        <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-300">
          Sign out
        </span>
      )}
    </button>
  )
}
