"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Ingredient {
  id: string
  name: string
  unit: string
}

interface IngredientSearchSelectProps {
  onSelect: (ingredient: Ingredient) => void
  excludeIds?: string[]
  placeholder?: string
}

export default function IngredientSearchSelect({ 
  onSelect, 
  excludeIds = [],
  placeholder = "Search ingredients..." 
}: IngredientSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchIngredients = async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit')
        .ilike('name', `%${q}%`)
        .eq('is_active', true)
        .limit(10)

      if (error) throw error
      
      const filtered = (data || []).filter(item => !excludeIds.includes(item.id))
      setResults(filtered)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchIngredients(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors text-left"
                  onClick={() => {
                    onSelect(item)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground uppercase">{item.unit}</span>
                </button>
              ))}
            </div>
          ) : !loading && query.length >= 2 ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No ingredients found
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
