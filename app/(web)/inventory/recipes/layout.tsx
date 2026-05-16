"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChefHat, 
  Scale, 
  CircleDollarSign, 
  ChevronRight,
  ClipboardList,
  ChevronLeft,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const recipeNavItems = [
  { 
    label: 'Recipe List', 
    href: '/inventory/recipes', 
    icon: ClipboardList,
    description: 'Manage master recipe catalog'
  },
  { 
    label: 'Recipe Scaling', 
    href: '/inventory/recipes/scaling', 
    icon: Scale,
    description: 'Simulate production volumes'
  },
  { 
    label: 'Cost Analysis', 
    href: '/inventory/recipes/costing', 
    icon: CircleDollarSign,
    description: 'Detailed pricing & breakdowns'
  },
]

export default function RecipeLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="flex h-full -m-8 bg-white overflow-hidden border-t border-slate-100">
      {/* Module Sidebar */}
      <aside className={cn(
        "border-r border-slate-100 bg-slate-50/30 flex flex-col shrink-0 transition-all duration-300 relative",
        isOpen ? "w-64" : "w-16"
      )}>
        <div className="p-6 border-b border-slate-100 bg-white min-h-[85px] flex items-center justify-between">
          <div className={cn("flex items-center gap-2 overflow-hidden transition-all", !isOpen && "w-0 opacity-0")}>
            <ChefHat className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
               <h2 className="font-bold text-slate-900 tracking-tight text-sm truncate">Culinary Intel</h2>
               <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider truncate">Recipe Management</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className={cn("h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all", !isOpen && "mx-auto")}
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
          {recipeNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isOpen ? item.label : undefined}
                className={cn(
                  "flex flex-col gap-1 p-2.5 rounded-xl transition-all duration-200 group border",
                  isActive 
                    ? "bg-white border-blue-100 shadow-sm ring-1 ring-blue-50" 
                    : "border-transparent hover:bg-white hover:border-slate-200",
                  !isOpen && "items-center px-0"
                )}
              >
                <div className={cn("flex items-center justify-between w-full", !isOpen && "justify-center")}>
                  <div className="flex items-center gap-2.5">
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    )} />
                    {isOpen && (
                      <span className={cn(
                        "text-xs font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300",
                        isActive ? "text-blue-700" : "text-slate-600 group-hover:text-slate-900"
                      )}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {isOpen && isActive && <ChevronRight className="h-3 w-3 text-blue-400" />}
                </div>
                {isOpen && isActive && (
                  <p className="text-[10px] text-slate-400 font-medium pl-6 animate-in fade-in duration-500">
                    {item.description}
                  </p>
                )}
              </Link>
            )
          })}
        </nav>

        {isOpen && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 animate-in fade-in duration-300">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100/50">
              <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Intelligence Note</p>
              <p className="text-[10px] leading-relaxed text-blue-600/80 font-medium">
                Costs are synced with live inventory Weighted Average Cost (WAC).
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Module Content */}
      <main className="flex-1 overflow-y-auto bg-white relative">
        {children}
      </main>
    </div>
  )
}
