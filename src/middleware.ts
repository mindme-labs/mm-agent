import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  if (pathname.startsWith('/app')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  if (pathname.startsWith('/auth/') && token) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/auth/:path*'],
}
