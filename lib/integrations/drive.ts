// Google Drive integration stub.
// Supabase Storage is the source of truth.
// Implement OAuth2 + Drive API here if needed.

export async function createClientFolder(_clientName: string): Promise<string | null> {
  console.log('[Drive stub] createClientFolder — not implemented')
  return null
}

export async function uploadToDrive(_filePath: string, _destFolderId: string): Promise<string | null> {
  console.log('[Drive stub] uploadToDrive — not implemented')
  return null
}
