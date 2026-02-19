import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { story_id, choice_text } = body;

    const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CONTINUE_WEBHOOK;
    const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY;

    if (!N8N_WEBHOOK_URL) return NextResponse.json({ error: 'No URL' }, { status: 500 });
    
    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-rpg': N8N_API_KEY ?? '',
      },
      body: JSON.stringify(body),
    }).catch(err => console.error("Erro silencioso no disparo do n8n:", err));

   
    return NextResponse.json({ success: true, status: 'processing_background' });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}