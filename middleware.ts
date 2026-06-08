import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// アクセスのたびにセッションを7日延長するローリングセッション
export function middleware(request: NextRequest) {
  const session = request.cookies.get('admin_session')

  if (session?.value === 'authenticated') {
    const response = NextResponse.next()
    response.cookies.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7日（アクセスのたびにリセット）
      path: '/',
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
