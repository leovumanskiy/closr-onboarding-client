'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setNotifications(Array.isArray(data) ? data : []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const unread = notifications.filter(n => !n.read_at).length

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(ns => ns.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          open ? 'bg-muted' : 'hover:bg-muted'
        )}
      >
        <Bell className="h-[18px] w-[18px] text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-primary border-2 border-white" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover shadow-xl z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unread > 0 && (
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 tabular-nums">
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : notifications.map(n => (
                <div
                  key={n.id}
                  className={cn('px-4 py-3 text-sm transition-colors hover:bg-muted/20', !n.read_at && 'bg-primary/[0.04]')}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                    <div className={cn('min-w-0', n.read_at && 'pl-3.5')}>
                      <p className={cn('font-medium leading-tight', !n.read_at ? 'text-foreground' : 'text-muted-foreground')}>
                        {n.title}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
