import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  if (pathname.startsWith('/app') && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Forward the request pathname to server components — Next.js doesn't
  // expose it through `headers()` by default. The wizard-state-machine
  // layout (`src/app/(frontend)/app/layout.tsx`) reads `x-pathname`.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/app/:path*'],
}
