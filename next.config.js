/** @type {import('next').NextConfig} */

// High-value security headers. We deliberately do NOT set a restrictive
// script-src/frame-src CSP: the app injects arbitrary third-party embed
// scripts and iframes (GoHighLevel forms, Loom, Calendly), so an allowlist
// would break the product. `frame-ancestors 'none'` is the safe high-value
// CSP directive (anti-clickjacking) and is kept here.
//
// To tighten later, build a script-src/frame-src allowlist from the actual
// embed domains in use and add it below.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
]

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
