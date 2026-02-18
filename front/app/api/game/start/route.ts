import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Pega as variáveis de ambiente do lado do servidor (seguro)
    const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_START_WEBHOOK;
    const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY;

    if (!N8N_WEBHOOK_URL || !N8N_API_KEY) {
      return NextResponse.json(
        { error: 'Configuração de servidor incompleta (ENVs faltando).' },
        { status: 500 }
      );
    }

    // O Next.js chama o n8n (Servidor -> Servidor = Sem CORS)
    // IMPORTANTE: Aqui trocamos '/webhook-test/' por '/webhook/' para produção automática
    // Se sua URL no .env já for /webhook/, ele mantém.
    const productionUrl = N8N_WEBHOOK_URL.replace('/webhook-test/', '/webhook/');

    const n8nResponse = await fetch(productionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-rpg': N8N_API_KEY, 
      },
      body: JSON.stringify(body),
    });

    if (!n8nResponse.ok) {
      console.error(`Erro n8n: ${n8nResponse.status} - ${n8nResponse.statusText}`);
      // Mesmo se o n8n falhar, não queremos quebrar o jogo inteiro,
      // mas retornamos erro para o front saber.
      return NextResponse.json(
        { error: 'O Narrador não respondeu.' },
        { status: n8nResponse.status }
      );
    }

    const data = await n8nResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro interno na API Route:', error);
    return NextResponse.json(
      { error: 'Falha interna ao contatar o narrador.' },
      { status: 500 }
    );
  }
}