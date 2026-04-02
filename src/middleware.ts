import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  if (pathname.startsWith('/app')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  if (pathname === '/auth' && token) {
    return NextResponse.redirect(new URL('/app/inbox', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/auth'],
}
