import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { story_id } = body;

    if (!story_id) {
      return NextResponse.json({ error: 'story_id é obrigatório' }, { status: 400 });
    }

    // Pega as variáveis de ambiente do lado do servidor
    const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_RESUME_WEBHOOK;
    const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY;

    if (!N8N_WEBHOOK_URL) {
      console.error('NEXT_PUBLIC_N8N_RESUME_WEBHOOK não configurado.');
      return NextResponse.json({ error: 'Configuração de servidor incompleta.' }, { status: 500 });
    }

    // Ajuste para URL de produção (webhook-test -> webhook)
    const productionUrl = N8N_WEBHOOK_URL.replace('/webhook-test/', '/webhook/');

    // Chama o n8n para gerar o resumo (Fire and Forget ou Await, aqui faremos await para logar erro)
    const n8nResponse = await fetch(productionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-rpg': N8N_API_KEY || '', // Envia se existir
      },
      body: JSON.stringify({ story_id }),
    });

    if (!n8nResponse.ok) {
      console.error(`Erro ao chamar resumo no n8n: ${n8nResponse.status}`);
      // Não retornamos erro 500 para o front não quebrar, apenas logamos, 
      // pois o resumo é um processo de background.
      return NextResponse.json({ success: false, message: 'Falha ao acionar resumo.' });
    }

    const data = await n8nResponse.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro interno na API de Resumo:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar resumo.' },
      { status: 500 }
    );
  }
}