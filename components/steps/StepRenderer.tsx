import type { StepWithProgress } from '@/lib/journey/types'
import type { ExistingUpload, ExistingBooking } from '@/lib/journey/submissions'
import { VideoStep } from './VideoStep'
import { DocumentStep } from './DocumentStep'
import { FormStep } from './FormStep'
import { UploadStep } from './UploadStep'
import { BookingStep } from './BookingStep'
import { ConditionalStep } from './ConditionalStep'
import { ExternalStep } from './ExternalStep'
import { DashboardStep } from './DashboardStep'
import { VideoDocumentStep } from './VideoDocumentStep'
import { IframeStep } from './IframeStep'
import { CheckpointStep } from './CheckpointStep'

interface StepRendererProps {
  step: StepWithProgress
  clientId: string
  moduleSlug: string
  stepSlug: string
  initialSubmission?: Record<string, unknown> | null
  existingUploads?: ExistingUpload[]
  existingBooking?: ExistingBooking | null
}

export function StepRenderer({
  step,
  clientId,
  moduleSlug,
  stepSlug,
  initialSubmission,
  existingUploads,
  existingBooking,
}: StepRendererProps) {
  const base = { step, clientId, moduleSlug }

  switch (step.type) {
    case 'video':       return <VideoStep {...base} />
    case 'document':    return <DocumentStep {...base} />
    case 'form':        return <FormStep {...base} stepSlug={stepSlug} initialValues={initialSubmission as Record<string, string | boolean> | null | undefined} />
    case 'upload':      return <UploadStep {...base} stepSlug={stepSlug} />
    case 'booking':     return <BookingStep {...base} existingBooking={existingBooking} />
    case 'conditional': return <ConditionalStep {...base} stepSlug={stepSlug} initialSubmission={initialSubmission} />
    case 'external':        return <ExternalStep {...base} />
    case 'dashboard':       return <DashboardStep {...base} />
    case 'video_document':  return <VideoDocumentStep {...base} />
    case 'iframe':          return <IframeStep {...base} />
    case 'checkpoint':      return <CheckpointStep {...base} />
    default:
      return <div className="text-muted-foreground">Unknown step type: {(step as any).type}</div>
  }
}
