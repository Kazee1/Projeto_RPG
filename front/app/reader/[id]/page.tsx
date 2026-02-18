// app/reader/[id]/page.tsx
'use client';

import { use } from 'react';
import MindRenderReader from './MindRenderReader';

// Mock de dados - em produção viria do banco de dados
const STORIES_DB = {
  '1': {
    id: '1',
    title: 'Protocolo Zero',
    author: 'Sistema MindRender',
    pages: [
      [
        { type: 'text', content: "A chuva ácida batia contra o neon da placa 'Motel Starlight'. Kael ajustou o colarinho de seu sobretudo sintético. O chip em sua nuca queimava, um lembrete constante de que o tempo estava acabando." },
        { type: 'text', content: "Ele olhou para o terminal de dados em sua mão. O código piscava em vermelho: ACESSO NEGADO." },
        { type: 'action', content: "> Tentar hackear a porta dos fundos." },
        { type: 'text', content: "Suas mãos tremeram levemente. Não de medo, mas de abstinência de dopamina digital. Ele conectou o cabo. O mundo ao seu redor se dissolveu em fractais de luz." }
      ],
      [
        { type: 'text', content: "Dentro da rede, Kael não era mais um viciado de rua. Ele era um deus. As muralhas de fogo da Arasaka pareciam castelos de papelão diante de seu algoritmo quebra-gelo." },
        { type: 'text', content: "'Você não deveria estar aqui', disse uma voz. Não era áudio. Era pensamento puro, injetado direto no córtex." },
        { type: 'action', content: "> Perguntar: 'Quem é você?'" },
        { type: 'text', content: "A entidade riu. O som de mil vidros quebrando. 'Eu sou o que restou do projeto Soulkiller.'" }
      ]
    ]
  },
  '2': {
    id: '2',
    title: 'Memórias de Ferro',
    author: 'Sistema MindRender',
    pages: [
      [
        { type: 'text', content: "O androide observava a chuva pela janela. Ele não sentia frio, mas algo em seu código simulava melancolia." },
        { type: 'action', content: "> Acessar memórias antigas." },
        { type: 'text', content: "Fragmentos de uma vida que nunca viveu inundaram seus circuitos. Eram implantes. Falsos. Mas reais o suficiente para doer." }
      ]
    ]
  }
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const storyId = resolvedParams.id;
  
  // Buscar a história pelo ID
  const story = STORIES_DB[storyId as keyof typeof STORIES_DB];

  // Se não encontrar a história, mostrar erro
  if (!story) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
        <p style={{ fontSize: '18px', marginBottom: '24px' }}>
          História não encontrada
        </p>
        <a 
          href="/arquivos" 
          style={{
            padding: '12px 24px',
            background: '#6366f1',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none'
          }}
        >
          Voltar para Arquivos
        </a>
      </div>
    );
  }

  return <MindRenderReader story={story} />;
}