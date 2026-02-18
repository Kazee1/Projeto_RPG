import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { story_id, choice_text, choice_type, skill_check, difficulty, dice_type, roll_result } = body;

    if (!story_id || !choice_text) {
      return NextResponse.json(
        { error: 'story_id e choice_text são obrigatórios.' },
        { status: 400 }
      );
    }

    const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CONTINUE_WEBHOOK;
    const N8N_API_KEY     = process.env.NEXT_PUBLIC_N8N_API_KEY;

    if (!N8N_WEBHOOK_URL) {
      console.error('NEXT_PUBLIC_N8N_CONTINUE_WEBHOOK não configurado.');
      return NextResponse.json({ error: 'Configuração de servidor incompleta.' }, { status: 500 });
    }

    const productionUrl = N8N_WEBHOOK_URL.replace('/webhook-test/', '/webhook/');

    const formattedRollResult = roll_result ? {
      total:       roll_result.total,
      roll:        roll_result.total,
      difficulty:  difficulty ?? 10,
      success:     roll_result.total >= (difficulty ?? 10),
      is_critical: roll_result.total === parseInt((dice_type ?? 'd20').substring(1)),
    } : null;

    const payload = {
      story_id,
      player_message: {
        content:     choice_text,
        type:        choice_type ?? 'action',
        skill_check: skill_check ?? null,
        difficulty:  difficulty  ?? null,
        dice_type:   dice_type   ?? null,
        roll_result: formattedRollResult,
      },
    };

    // Dispara o n8n sem await — não bloqueia, não espera resposta
    // O resultado chega via Supabase Realtime no front-end
    fetch(productionUrl, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-rpg':       N8N_API_KEY ?? '',
      },
      body: JSON.stringify(payload),
    }).catch(err => console.error('Erro ao disparar n8n:', err));
    console.log("win")
    // Retorna imediatamente — front escuta o Realtime para a resposta real
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro interno no continue:', error);
    return NextResponse.json(
      { error: 'Falha interna ao contatar o narrador.' },
      { status: 500 }
    );
  }
}