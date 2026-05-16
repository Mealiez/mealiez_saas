"use client"

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function SidebarSignOut() {
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
      className="w-full flex items-center gap-3 px-3 py-2 text-sm 
                 text-slate-400 hover:text-red-400 
                 hover:bg-red-500/10 rounded-xl 
                 transition-all duration-200 group"
    >
      <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      <span className="font-medium">Sign out</span>
    </button>
  )
}
