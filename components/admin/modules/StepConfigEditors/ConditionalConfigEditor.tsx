'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStep } from '@/lib/admin/actions'
import type { ConditionalConfig, ConditionalBranch, FormField } from '@/lib/journey/types'
import { Plus, Trash2 } from 'lucide-react'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const smallInput = 'w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const FIELD_TYPES = ['text', 'email', 'url', 'number', 'textarea', 'select', 'checkbox']

export function ConditionalConfigEditor({ stepId, config }: { stepId: string; config: ConditionalConfig }) {
  const [questionField, setQuestionField] = useState(config?.question?.field ?? '')
  const [questionLabel, setQuestionLabel] = useState(config?.question?.label ?? '')
  const [branches, setBranches] = useState<ConditionalBranch[]>(config?.branches ?? [])
  const [saving, setSaving] = useState(false)

  function addBranch() {
    setBranches(b => [...b, {
      when: { [questionField || 'field']: true },
      content: { heading: '', description: '', fields: [] },
    }])
  }

  function updateBranchWhen(i: number, value: boolean | string) {
    setBranches(b => b.map((br, j) => j !== i ? br : { ...br, when: { [questionField]: value } }))
  }

  function updateBranchContent(i: number, patch: Partial<ConditionalBranch['content']>) {
    setBranches(b => b.map((br, j) => j !== i ? br : { ...br, content: { ...br.content, ...patch } }))
  }

  function addBranchField(branchIdx: number) {
    const _id = Math.random().toString(36).slice(2)
    updateBranchContent(branchIdx, {
      fields: [...(branches[branchIdx].content.fields ?? []),
        { name: `field_${Date.now()}`, label: '', type: 'text', required: false }],
    })
  }

  function updateBranchField(branchIdx: number, fieldIdx: number, patch: Partial<FormField>) {
    const updated = branches[branchIdx].content.fields.map((f, j) => j === fieldIdx ? { ...f, ...patch } : f)
    updateBranchContent(branchIdx, { fields: updated })
  }

  function deleteBranchField(branchIdx: number, fieldIdx: number) {
    updateBranchContent(branchIdx, { fields: branches[branchIdx].content.fields.filter((_, j) => j !== fieldIdx) })
  }

  async function save() {
    setSaving(true)
    const res = await updateStep({
      id: stepId,
      config: { question: { field: questionField, label: questionLabel }, branches },
    })
    setSaving(false)
    res.error ? toast.error(res.error) : toast.success('Saved')
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Question field name</label>
          <input value={questionField} onChange={e => setQuestionField(e.target.value)} placeholder="has_ghl" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Question label (shown to client)</label>
          <input value={questionLabel} onChange={e => setQuestionLabel(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Branches</p>
          <button onClick={addBranch} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add branch
          </button>
        </div>

        {branches.map((branch, bi) => (
          <div key={bi} className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">When answer =</label>
                <select
                  value={String(Object.values(branch.when)[0])}
                  onChange={e => updateBranchWhen(bi, e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value)}
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="true">Yes / true</option>
                  <option value="false">No / false</option>
                </select>
              </div>
              <button onClick={() => setBranches(b => b.filter((_, j) => j !== bi))} className="text-destructive/60 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Heading</label>
                <input value={branch.content.heading} onChange={e => updateBranchContent(bi, { heading: e.target.value })} className={smallInput} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Description</label>
                <input value={branch.content.description} onChange={e => updateBranchContent(bi, { description: e.target.value })} className={smallInput} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground">Branch fields</p>
              {branch.content.fields.map((f, fi) => (
                <div key={fi} className="flex gap-2 items-start bg-background rounded border p-2">
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    <input value={f.label} onChange={e => updateBranchField(bi, fi, { label: e.target.value })} placeholder="Label" className={smallInput} />
                    <input value={f.name} onChange={e => updateBranchField(bi, fi, { name: e.target.value.replace(/\s+/g, '_').toLowerCase() })} placeholder="field_name" className={smallInput} />
                    <select value={f.type} onChange={e => updateBranchField(bi, fi, { type: e.target.value as FormField['type'] })} className={smallInput}>
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <button onClick={() => deleteBranchField(bi, fi)} className="text-destructive/60 hover:text-destructive mt-0.5">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => addBranchField(bi)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <Plus className="h-2.5 w-2.5" /> Add field
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
