import { NextResponse } from 'next/server'
// Importe a função do arquivo novo que criamos acima
import { createClient } from '@/utils/supabase/server' 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    // Agora o createClient é async e gerencia cookies automaticamente
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Se tiver um parâmetro 'next', redireciona para ele, senão vai para home
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se der erro, manda para uma página de erro
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}