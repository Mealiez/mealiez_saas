"use client"

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      className="w-full text-left px-3 py-2 text-sm 
                 text-gray-600 hover:text-red-600 
                 hover:bg-red-50 rounded-lg 
                 transition-colors"
    >
      Sign out
    </button>
  )
}
