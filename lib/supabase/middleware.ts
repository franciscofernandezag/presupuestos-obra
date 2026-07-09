import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    'https://spssdksmnbytmfjpjxzv.supabase.co',
    'sb_publishable_-_XchJw1CrPShjrcb1OwTw_q_iUzL4v',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: No ejecutes `supabase.auth.getUser()` en rutas públicas
  // porque puede causar errores si no hay sesión
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Definir rutas públicas y protegidas
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password')

  const isPublicRoute = request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/api/auth')

  const isProtectedRoute = !isAuthRoute && !isPublicRoute

  // Redirigir a login si no está autenticado y intenta acceder a ruta protegida
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirigir a home si está autenticado y intenta acceder a rutas de auth
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}