"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CloseSessionButtonProps {
  sessionId: string
}

export default function CloseSessionButton({ sessionId }: CloseSessionButtonProps) {
  const router = useRouter()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = async () => {
    setIsClosing(true)
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      })

      if (res.ok) {
        toast.success('Session closed successfully')
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to close session')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold gap-2"
          disabled={isClosing}
        >
          {isClosing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          Close Session
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            Closing the session will disable all check-ins. This action can be undone by an administrator if needed, but it's recommended to only close sessions when the meal time is over.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleClose}
            className="bg-red-600 hover:bg-red-700"
          >
            Confirm Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
