'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseClientregister';
import { Play, Plus, X, Loader2, AlertTriangle, Trash2 } from 'lucide-react'; 
import Link from 'next/link';
import styles from '@/styles/home.module.css';

interface Story {
  id: string;
  character_name: string;
  class_name: string;
  level?: number; 
  system: string;
  difficulty: string;
  created_at: string;
  hpCurrent: number;
  hpMax: number;
  lastSnippet: string;
  attributes?: any;
  background?: string;
}

const MAX_STORIES = 3;

export default function MindRenderHome() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar o Modal de Exclusão
  const [storyToDelete, setStoryToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. BUSCAR HISTÓRIAS DO USUÁRIO
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('stories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedStories: Story[] = data.map(story => ({
          ...story,
          level: story.level || 1,
          hpCurrent: story.hp_current || (story.attributes?.forca ? 10 + story.attributes.forca : 10),
          hpMax: story.hp_max || (story.attributes?.forca ? 10 + story.attributes.forca : 10),
          lastSnippet: story.background || "A aventura aguarda o primeiro passo...",
        }));

        setStories(formattedStories);

      } catch (error) {
        console.error("Erro ao carregar histórias:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [router]);

  // 2. ABRIR MODAL
  const requestDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    setStoryToDelete({ id, name });
  };

  // 3. CONFIRMAR EXCLUSÃO (Agora apaga tudo)
  const confirmDelete = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);

    try {
      // Como configuramos ON DELETE CASCADE no banco, apagar a story apaga TUDO.
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyToDelete.id);

      if (error) throw error;

      // Remove da lista localmente
      setStories(prev => prev.filter(s => s.id !== storyToDelete.id));
      setStoryToDelete(null); // Fecha modal

    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getHpStyle = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    let color = 'var(--neon-green, #4ade80)';
    if (percentage < 30) color = 'var(--neon-red, #ef4444)';
    else if (percentage < 70) color = '#fbbf24';
    return { width: `${percentage}%`, backgroundColor: color };
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className="spin" size={32} style={{marginRight: 10}} /> Carregando Realidades...
      </div>
    );
  }

  return (
    <div className={styles.nexusContainer}>

      {/* 1. Seção de Boas-vindas */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.greeting}>Bem-vindo ao Nexus, Viajante.</h1>
        <p className={styles.subGreeting}>
          Seus universos estão congelados no tempo. Você possui <strong>{stories.length}</strong> de <strong>{MAX_STORIES}</strong> slots de memória ativos.
        </p>
      </div>

      {/* 2. Grid de Sessões */}
      <div className={styles.sessionsGrid}>

        {/* CARD NOVA CRÔNICA */}
        {stories.length < MAX_STORIES && (
          <Link
            href="/NewGame"
            className={`${styles.storyCard} ${styles.newGameCard}`}
          >
            <div className={styles.plusIcon}>
              <Plus size={24} />
            </div>
            <h3 className={styles.newGameTitle}>Nova Crônica</h3>
            <p className={styles.newGameSub}>Gerar universo procedural</p>
          </Link>
        )}

        {/* LISTA DE SESSÕES */}
        {stories.map((session) => (
          <Link
            href={`/game/${session.id}`}
            key={session.id}
            className={styles.storyCard}
          >
            
            {/* BOTÃO DE EXCLUIR */}
            <button 
              className={styles.deleteBtn}
              onClick={(e) => requestDelete(e, session.id, session.character_name)}
              title="Excluir Crônica"
            >
              <X size={14} />
            </button>

            {/* Cabeçalho */}
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.charName}>{session.character_name}</h2>
                <div className={styles.charClass}>
                  {session.class_name || 'Aventureiro'} • Lvl {session.level}
                </div>
              </div>
              <div className={styles.locationBadge}>
                {session.system === 'dnd' ? 'Fantasia' : 
                 session.system === 'cyber' ? 'Cyberpunk' : 
                 session.system === 'vampire' ? 'Gótico' : 'Wasteland'}
              </div>
            </div>

            {/* Barra de Vida */}
            <div className={styles.hpContainer} title={`Vida: ${session.hpCurrent}/${session.hpMax}`}>
              <div className={styles.hpBar} style={getHpStyle(session.hpCurrent, session.hpMax)} />
            </div>

            {/* Trecho */}
            <div className={styles.lastSnippet}>
              "{session.lastSnippet?.substring(0, 120)}..."
            </div>

            {/* Botão Ação */}
            <div className={styles.resumeBtn}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Play size={14} fill="currentColor" /> Retomar
              </span>
            </div>

          </Link>
        ))}
      </div>

      {/* MODAL DE EXCLUSÃO CUSTOMIZADO */}
      {storyToDelete && (
        <div className={styles.modalOverlay} onClick={() => !isDeleting && setStoryToDelete(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle}>Apagar Realidade?</h3>
            <p className={styles.modalText}>
              Tem certeza que deseja deletar a crônica de <strong>{storyToDelete.name}</strong>?
              <br/><br/>
              Essa ação irá destruir permanentemente o personagem, inventário e todo o histórico de escolhas. 
              <span style={{color:'#ef4444', display:'block', marginTop:8, fontWeight:700}}>Isso não pode ser desfeito.</span>
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setStoryToDelete(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                className={styles.confirmBtn} 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="spin" size={18}/> : <Trash2 size={18} />}
                {isDeleting ? 'Apagando...' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}