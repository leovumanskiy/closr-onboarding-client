// Convert a Google Docs / Sheets / Slides / Drive URL into an embeddable preview URL.
// Returns null if the URL is not a recognised embeddable Google document.
//
// Supported inputs (any /edit, /view, /preview suffix; with or without query/hash):
//   - https://docs.google.com/document/d/{id}/...
//   - https://docs.google.com/spreadsheets/d/{id}/...
//   - https://docs.google.com/presentation/d/{id}/...
//   - https://drive.google.com/file/d/{id}/...
//   - https://drive.google.com/open?id={id}
//
// Embeddable PDFs hosted at a public URL (.pdf) are returned as-is — modern browsers
// render them inline in <iframe>.
export function toDocPreviewUrl(rawUrl: string): string | null {
  if (!rawUrl) return null
  let u: URL
  try { u = new URL(rawUrl) } catch { return null }

  if (u.hostname === 'docs.google.com') {
    const m = u.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/)
    if (m) {
      const [, kind, id] = m
      return `https://docs.google.com/${kind}/d/${id}/preview`
    }
  }

  if (u.hostname === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([^/]+)/)
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
    const id = u.searchParams.get('id')
    if (u.pathname === '/open' && id) {
      return `https://drive.google.com/file/d/${id}/preview`
    }
  }

  if (u.pathname.toLowerCase().endsWith('.pdf')) return rawUrl

  return null
}
