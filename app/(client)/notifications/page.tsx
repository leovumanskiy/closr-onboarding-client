import { requireUser } from '@/lib/auth/requireUser'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Bell } from 'lucide-react'

export default async function NotificationsPage() {
  const session = await requireUser()
  const supabase = await createClient()

  const { data: notificationsRaw } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.id)
    .order('created_at', { ascending: false })
  const notifications = (notificationsRaw ?? []) as any[]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {notifications.map(n => (
            <div key={n.id} className={cn('px-4 py-3', !n.read_at && 'bg-primary/5')}>
              <p className={cn('font-medium text-sm', !n.read_at && 'text-primary')}>{n.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
