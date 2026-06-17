import type { Database, StepType, StepStatus } from '@/lib/supabase/types'

export type Module = Database['public']['Tables']['modules']['Row']
export type Step = Database['public']['Tables']['steps']['Row']
export type ClientProgress = Database['public']['Tables']['client_progress']['Row']
export type Client = Database['public']['Tables']['clients']['Row']

export interface ModuleWithSteps extends Module {
  steps: StepWithProgress[]
  progress: 'locked' | 'in_progress' | 'completed'
  completedCount: number
}

export interface StepWithProgress extends Step {
  progress: ClientProgress | null
  status: StepStatus
}

export interface JourneyState {
  modules: ModuleWithSteps[]
  currentModule: ModuleWithSteps | null
  currentStep: StepWithProgress | null
  totalSteps: number
  completedSteps: number
  percentComplete: number
}

// Step config shapes
export interface VideoConfig {
  url: string
  min_watch_seconds?: number
}

export interface DocumentConfig {
  url: string
  require_ack: boolean
  cta_label?: string
  instructions?: string
  // When true, suppress the inline iframe preview (Google Docs / PDFs) and only
  // show the link card. Defaults to false — preview is auto-rendered when the
  // URL is recognised as embeddable.
  disable_preview?: boolean
  preview_height?: number
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'url' | 'number' | 'textarea' | 'select' | 'checkbox'
  options?: string[]
  required?: boolean
  placeholder?: string
}

export interface FormConfig {
  fields: FormField[]
  submitTo?: 'internal' | 'copywriter'
  instructions?: string
}

export interface UploadConfig {
  label: string
  accept: string
  min_files: number
  max_files: number
  max_size_mb: number
  reminder_days?: number[]
  notify_team_on_upload?: boolean
  instructions?: string
  embed_url?: string
  embed_height?: number
  embed_label?: string
  embed_script_url?: string
  // When true, hide the direct file-upload UI and only show the embedded form.
  // The user marks the step complete after submitting the embedded form.
  embed_only?: boolean
}

export interface BookingConfig {
  calendar_url: string
  call_type: string
  duration_min: number
  description?: string
  recurring?: boolean
}

export interface ConditionalBranch {
  when: Record<string, boolean | string>
  content: {
    heading: string
    description: string
    fields: FormField[]
  }
}

export interface ConditionalConfig {
  question: { field: string; label: string }
  branches: ConditionalBranch[]
}

export interface ExternalConfig {
  provider: 'ghl'
  metric: string
  label: string
}

export interface DashboardConfig {
  source: 'ghl' | 'mock'
  metrics: string[]
  description?: string
}

export interface VideoDocumentConfig {
  video_url: string
  min_watch_seconds?: number
  doc_url: string
  doc_label?: string
  doc_require_ack?: boolean
  instructions?: string
  heading?: string
  // Optional second video+document pair (used when two steps are merged)
  video_url_2?: string
  doc_url_2?: string
  doc_label_2?: string
  doc_require_ack_2?: boolean
  heading_2?: string
}

export interface IframeConfig {
  url: string
  height?: number
  instructions?: string
  open_in_new_tab?: boolean
  embed_script_url?: string
  // Optional Loom/YouTube/Vimeo walkthrough rendered above the iframe.
  intro_video_url?: string
  intro_video_label?: string
  // Optional "Make a Copy" CTA (e.g. for Google Docs templates).
  make_copy_url?: string
  make_copy_label?: string
  // Copy shown next to the "Open it here" fallback button. Defaults to a
  // generic message; set per step (e.g. "Having issues booking?" for booking
  // iframes, "Form not loading?" for form iframes).
  fallback_prompt?: string
  // Label for the "I've done it" checkbox. Defaults to a generic message;
  // set per step (e.g. "I have submitted the form above" for forms,
  // "I have booked my call" for bookings).
  confirm_label?: string
}
