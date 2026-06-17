import { NextResponse } from 'next/server'

// Sign-out is handled by NextAuth at /api/auth/signout
export async function POST() {
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
}
