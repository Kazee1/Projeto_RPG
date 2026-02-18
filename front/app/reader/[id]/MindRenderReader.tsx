'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, Heart } from 'lucide-react'; // 1. Importei o Heart
import Link from 'next/link';
import styles from '@/styles/reader.module.css';

interface StoryBlock {
  type: 'text' | 'action';
  content: string;
}

interface Story {
  id: string;
  title: string;
  author: string;
  pages: StoryBlock[][];
}

interface MindRenderReaderProps {
  story: Story;
}

export default function MindRenderReader({ story }: MindRenderReaderProps) {
  // Configurações do Leitor
  const [settings, setSettings] = useState({
    theme: 'cyber',
    fontSize: 'medium',
    fontFamily: 'serif'
  });
  
  const [currentPage, setCurrentPage] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // 2. Novo Estado para o Like
  const [isLiked, setIsLiked] = useState(false);

  // --- EFEITOS DE LOAD (Carregar dados salvos) ---

  useEffect(() => {
    // Carregar progresso da página
    const savedProgress = localStorage.getItem(`story-${story.id}-progress`);
    if (savedProgress) {
      setCurrentPage(parseInt(savedProgress, 10));
    }

    // 3. Carregar se já deu like anteriormente
    const savedLike = localStorage.getItem(`story-${story.id}-liked`);
    if (savedLike === 'true') {
      setIsLiked(true);
    }
  }, [story.id]);

  // Carregar preferências globais
  useEffect(() => {
    const savedSettings = localStorage.getItem('reader-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      }
    }
  }, []);

  // --- EFEITOS DE SAVE (Salvar dados) ---

  // Salvar progresso
  useEffect(() => {
    localStorage.setItem(`story-${story.id}-progress`, currentPage.toString());
  }, [currentPage, story.id]);

  // Salvar preferências
  useEffect(() => {
    localStorage.setItem('reader-settings', JSON.stringify(settings));
  }, [settings]);

  // 4. Função para alternar e salvar o Like
  const toggleLike = () => {
    const newState = !isLiked;
    setIsLiked(newState);
    localStorage.setItem(`story-${story.id}-liked`, newState.toString());
    
    // Opcional: Aqui você chamaria sua API para computar o like no banco
    console.log(`Like na história ${story.id}: ${newState}`);
  };

  // Classes Dinâmicas (Mantidas iguais)
  const getThemeClass = () => {
    if (settings.theme === 'paper') return styles.themePaper;
    if (settings.theme === 'terminal') return styles.themeTerminal;
    return styles.themeCyber;
  };

  const getFontClass = () => {
    if (settings.fontFamily === 'sans') return styles.fontSans;
    if (settings.fontFamily === 'mono') return styles.fontMono;
    return styles.fontSerif;
  };

  const getSizeStyle = () => {
    if (settings.fontSize === 'small') return { fontSize: '14px' };
    if (settings.fontSize === 'large') return { fontSize: '20px' };
    if (settings.fontSize === 'xl') return { fontSize: '24px' };
    return { fontSize: '16px' };
  };

  // Navegação por teclado (Mantida igual)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(c => c - 1);
      } else if (e.key === 'ArrowRight' && currentPage < story.pages.length - 1) {
        setCurrentPage(c => c + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, story.pages.length]);

  return (
    <div className={`${styles.readerContainer} ${getThemeClass()}`}>
      
      {/* HEADER */}
      <header className={styles.readerHeader}>
        <Link href="/arquivos" className={styles.backLink}>
          <ArrowLeft size={18} /> Voltar
        </Link>
        
        <div style={{ fontSize: '14px', opacity: 0.6, fontStyle: 'italic' }}>
          Crônica: {story.title}
        </div>

        <div className={styles.controls}>
          
          {/* 5. BOTÃO DE LIKE ADICIONADO AQUI */}
          <button 
            className={styles.settingsBtn}
            onClick={toggleLike}
            title={isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            style={{ 
              color: isLiked ? 'var(--neon-red)' : 'inherit', // Usa vermelho neon se curtido
              transition: 'all 0.3s ease'
            }}
          >
            <Heart 
              size={20} 
              fill={isLiked ? "currentColor" : "none"} // Preenche o coração se curtido
              style={{ 
                transform: isLiked ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Efeito de "pulo" ao clicar
              }}
            />
          </button>

          <button 
            className={styles.settingsBtn}
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Configurações"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* POPOVER DE CONFIGURAÇÕES */}
      {showSettings && (
        <div className={styles.settingsPopover}>
          
          <div className={styles.configRow}>
            <span className={styles.configLabel}>Tema</span>
            <div className={styles.configOptions}>
              {['cyber', 'paper', 'terminal'].map(t => (
                <button
                  key={t}
                  className={`${styles.optionBtn} ${settings.theme === t ? styles.optionBtnActive : ''}`}
                  onClick={() => setSettings({...settings, theme: t})}
                >
                  {t === 'cyber' ? 'Dark' : t === 'paper' ? 'Papel' : 'Hacker'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.configRow}>
            <span className={styles.configLabel}>Tamanho</span>
            <div className={styles.configOptions}>
              {['small', 'medium', 'large', 'xl'].map(s => (
                <button
                  key={s}
                  className={`${styles.optionBtn} ${settings.fontSize === s ? styles.optionBtnActive : ''}`}
                  onClick={() => setSettings({...settings, fontSize: s})}
                >
                  {s === 'small' ? 'P' : s === 'medium' ? 'M' : s === 'large' ? 'G' : 'XG'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.configRow}>
            <span className={styles.configLabel}>Fonte</span>
            <div className={styles.configOptions}>
              {['serif', 'sans', 'mono'].map(f => (
                <button
                  key={f}
                  className={`${styles.optionBtn} ${settings.fontFamily === f ? styles.optionBtnActive : ''}`}
                  onClick={() => setSettings({...settings, fontFamily: f})}
                >
                  {f === 'serif' ? 'Livro' : f === 'sans' ? 'Moderna' : 'Code'}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ÁREA DO LIVRO */}
      <div className={styles.bookContent}>
        <div className={`${styles.textColumn} ${getFontClass()}`} style={getSizeStyle()}>
          
          {/* Título da Página (Opcional, ajuda na localização) */}
          <div style={{ 
            textAlign: 'center', 
            opacity: 0.3, 
            fontSize: '12px', 
            marginBottom: '32px', 
            textTransform: 'uppercase', 
            letterSpacing: '2px' 
          }}>
             — Página {currentPage + 1} —
          </div>

          {story.pages[currentPage].map((block, idx) => (
            <div 
              key={idx} 
              className={block.type === 'action' ? styles.playerAction : styles.paragraph}
            >
              {block.content}
            </div>
          ))}

        </div>
      </div>

      {/* RODAPÉ / PAGINAÇÃO */}
      <footer className={styles.readerFooter}>
        <button 
          className={styles.navBtn} 
          disabled={currentPage === 0}
          onClick={() => setCurrentPage(c => c - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={24} />
        </button>

        <span className={styles.pageIndicator}>
          Página {currentPage + 1} de {story.pages.length}
        </span>

        <button 
          className={styles.navBtn}
          disabled={currentPage === story.pages.length - 1}
          onClick={() => setCurrentPage(c => c + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight size={24} />
        </button>
      </footer>

    </div>
  );
}