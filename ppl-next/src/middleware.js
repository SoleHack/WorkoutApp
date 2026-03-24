import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname, searchParams } = request.nextUrl

  // Handle password reset code exchange in middleware
  // so the session cookie is set before the page loads
  if (pathname === '/update-password' && searchParams.get('code')) {
    const code = searchParams.get('code')
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Code invalid/expired — redirect to login with error
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'reset_expired')
      return NextResponse.redirect(url)
    }

    // Code exchanged — redirect to clean URL (no code in URL)
    const url = request.nextUrl.clone()
    url.searchParams.delete('code')
    const redirectResponse = NextResponse.redirect(url)
    // Copy session cookies to redirect response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/update-password')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|woff)$).*)',
  ],
}
