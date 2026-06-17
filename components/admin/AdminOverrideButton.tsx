'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Unlock } from 'lucide-react'
import { adminUnlockStep } from '@/lib/admin/actions'

interface Props {
  stepId: string
  clientId: string
  stepTitle: string
}

export function AdminOverrideButton({ stepId, clientId, stepTitle }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleUnlock() {
    if (!confirm(`Force-complete "${stepTitle}" for this client? This will be audit-logged.`)) return
    setLoading(true)
    const result = await adminUnlockStep({ stepId, clientId })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Step force-completed')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleUnlock}
      disabled={loading}
      title="Force complete this step"
      className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <Unlock className="h-3.5 w-3.5" />
    </button>
  )
}
