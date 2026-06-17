'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Copy, Download, Check } from 'lucide-react'
import type { FormField } from '@/lib/journey/types'
import { cn } from '@/lib/utils'

interface Props {
  submission: {
    id: string
    submitted_at: string
    payload: Record<string, unknown>
    steps: { title: string; config?: { fields?: FormField[] } } | null
  }
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function buildRows(payload: Record<string, unknown>, fields: FormField[]) {
  const rows: { label: string; value: string; isLong: boolean }[] = []
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f]))

  // Known fields first (preserving order)
  for (const field of fields) {
    if (field.name in payload) {
      const raw = payload[field.name]
      const str = renderValue(raw)
      rows.push({ label: field.label || field.name, value: str, isLong: str.length > 80 })
    }
  }

  // Unknown fields (added after schema change)
  for (const [key, val] of Object.entries(payload)) {
    if (!fieldMap[key]) {
      const str = renderValue(val)
      rows.push({ label: key, value: str, isLong: str.length > 80 })
    }
  }

  return rows
}

export function SubmissionView({ submission }: Props) {
  const [copied, setCopied] = useState(false)
  const step = submission.steps
  const fields = step?.config?.fields ?? []
  const rows = buildRows(submission.payload ?? {}, fields)

  function copyText() {
    const text = rows.map(r => `${r.label}: ${r.value}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadCsv() {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
    const header = rows.map(r => escape(r.label)).join(',')
    const values = rows.map(r => escape(r.value)).join(',')
    const csv = `${header}\n${values}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `submission-${submission.id.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div>
          <p className="font-medium text-sm">{step?.title ?? 'Form submission'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(submission.submitted_at), 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyText}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border hover:bg-muted transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border hover:bg-muted transition-colors"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">No fields found in submission.</p>
      ) : (
        <dl className="divide-y">
          {rows.map((row, i) => (
            <div key={i} className={cn('px-4 py-2.5', row.isLong ? 'flex flex-col gap-0.5' : 'flex items-start gap-4')}>
              <dt className={cn('text-xs font-medium text-muted-foreground shrink-0', row.isLong ? '' : 'w-40')}>{row.label}</dt>
              <dd className={cn('text-sm', row.isLong ? 'whitespace-pre-wrap text-foreground/80' : 'flex-1 min-w-0 break-words')}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
