import { getClient } from '@/lib/auth/requireUser'
import { redirect } from 'next/navigation'
import { ProfileForm } from './ProfileForm'
import { GhlSettings } from '@/components/integrations/GhlSettings'

export default async function ProfilePage() {
  const client = await getClient()
  if (!client) redirect('/login')

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your business details and profile image.</p>
      </div>

      <ProfileForm
        initial={{
          fullName: client.full_name ?? '',
          businessName: client.business_name ?? '',
          businessWebsite: client.business_website ?? '',
          niche: client.niche ?? '',
          startDate: client.start_date ?? '',
          slackChannelId: client.slack_channel_id ?? '',
          slackUserId: client.slack_user_id ?? '',
        }}
        currentAvatarUrl={client.image_url ?? null}
      />

      <div>
        <h2 className="text-base font-semibold mb-3">Integrations</h2>
        <GhlSettings
          isConnected={!!client.has_ghl}
          locationId={client.ghl_location_id ?? null}
        />
      </div>
    </div>
  )
}
