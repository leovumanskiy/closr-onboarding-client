import { Video, FileText, ClipboardList, Upload, Calendar, GitBranch, Globe, BarChart2, Layers, Code, CheckSquare } from 'lucide-react'

export const STEP_TYPES = [
  'video', 'document', 'form', 'upload', 'booking',
  'conditional', 'external', 'dashboard', 'video_document', 'iframe', 'checkpoint',
] as const
export type StepType = typeof STEP_TYPES[number]

export const typeIcons: Record<string, React.ElementType> = {
  video: Video,
  document: FileText,
  form: ClipboardList,
  upload: Upload,
  booking: Calendar,
  conditional: GitBranch,
  external: Globe,
  dashboard: BarChart2,
  video_document: Layers,
  iframe: Code,
  checkpoint: CheckSquare,
}

export const typeLabels: Record<string, string> = {
  video: 'Video',
  document: 'Document',
  form: 'Form',
  upload: 'File Upload',
  booking: 'Booking',
  conditional: 'Conditional',
  external: 'External',
  dashboard: 'Dashboard',
  video_document: 'Video + Document',
  iframe: 'Embedded Form',
  checkpoint: 'Checkpoint',
}
