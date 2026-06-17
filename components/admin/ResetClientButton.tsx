'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resetClient } from '@/lib/admin/actions'
import { RotateCcw, Loader2 } from 'lucide-react'

interface Props {
  clientId: string
  businessName: string
}

export function ResetClientButton({ clientId, businessName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    setLoading(true)
    const result = await resetClient({ clientId })
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`${businessName} reset — journey restarted at Module 1, Step 1`)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-2">Reset progress?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium text-foreground">{businessName}</span>&apos;s journey will be
              reset back to <span className="font-medium text-foreground">Module 1, Step 1</span>.
              All step progress is cleared and SLA reminders re-arm from scratch. Their account,
              uploads, and form submissions are kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500/90 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
