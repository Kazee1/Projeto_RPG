import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 1. ADICIONEI '/auth/callback' AQUI. É OBRIGATÓRIO.
const publicRoutes = ['/login', '/register', '/recovery', '/verify', '/auth/callback']

export async function proxy(request: NextRequest) {
  // Cria uma resposta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl

  // --- REGRAS DE ROTEAMENTO ---

  // 1. Root ("/") redireciona para login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Se logado e tentando acessar rotas de Auth (Login, Register), manda pra Home
  // Nota: Não bloqueamos '/auth/callback' aqui, pois ela precisa rodar para setar o cookie
  if (user && ['/login', '/register', '/recovery', '/verify'].includes(pathname)) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // 3. Regra especial do '/verify' (sem email volta pro registro)
  if (!user && pathname === '/verify') {
    if (!searchParams.has('email')) {
      return NextResponse.redirect(new URL('/register', request.url))
    }
  }

  // 4. Se não logado e a rota NÃO for pública -> Login
  // Aqui é onde o '/auth/callback' precisava estar na lista de publicRoutes para passar
  if (!user && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}