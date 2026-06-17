import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'
import { Toaster } from 'sonner'
import { SessionProvider } from '@/components/SessionProvider'
import { ThemeProvider } from '@/components/brand/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const sora = Sora({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'CLOSR',
  description: 'Client onboarding portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${sora.variable}`}>
        <ThemeProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
