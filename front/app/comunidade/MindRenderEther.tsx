'use client';

import { useState, useMemo } from 'react';
import { Search, Heart, Eye, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import styles from '@/styles/ether.module.css';

// --- MOCK DATA ---
const initialFavorites = [
  { id: 101, title: "Crônicas de Nárnia", author: "C.S. Lewis AI", icon: "🦁" },
  { id: 102, title: "Matrix: Reloaded", author: "Neo_The_One", icon: "💊" },
  { id: 103, title: "O Vampiro de Curitiba", author: "Dalton T.", icon: "🦇" },
  { id: 104, title: "Duna: A Origem", author: "Herbert_Bot", icon: "🏜️" },
  { id: 105, title: "Senhor dos Anéis", author: "Gandalf_White", icon: "💍" },
  { id: 106, title: "Blade Runner 2055", author: "Kaze", icon: "🤖" },
];

const initialPublicStories = [
  {
    id: 1,
    title: "A Sombra sobre Innsmouth",
    author: "H.P. Lovecraft Fan",
    likes: 120,
    views: "1.2k",
    isLiked: true,
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
    createdAt: new Date('2025-01-15')
  },
  {
    id: 2,
    title: "Cyber-Detective 2099",
    author: "BladeRunner_X",
    likes: 154,
    views: "2.1k",
    isLiked: false,
    gradient: "linear-gradient(135deg, #0f172a 0%, #0e7490 100%)",
    createdAt: new Date('2025-02-10')
  },
  {
    id: 3,
    title: "O Último Feiticeiro",
    author: "Merlin_Redux",
    likes: 89,
    views: "890",
    isLiked: false,
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
    createdAt: new Date('2025-01-28')
  },
  {
    id: 4,
    title: "Neon Samurai",
    author: "Tokyo_Drift",
    likes: 203,
    views: "3.4k",
    isLiked: false,
    gradient: "linear-gradient(135deg, #0f172a 0%, #0e7490 100%)",
    createdAt: new Date('2025-02-08')
  },
  {
    id: 5,
    title: "Crônicas do Abismo",
    author: "Deep_Dreamer",
    likes: 76,
    views: "654",
    isLiked: false,
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
    createdAt: new Date('2025-02-01')
  },
  {
    id: 6,
    title: "Protocolo Ômega",
    author: "AI_Sentinel",
    likes: 312,
    views: "5.2k",
    isLiked: false,
    gradient: "linear-gradient(135deg, #0f172a 0%, #0e7490 100%)",
    createdAt: new Date('2025-02-11')
  }
];

export default function MindRenderEther() {
  const [activeFilter, setActiveFilter] = useState('popular');
  const [showAllFavs, setShowAllFavs] = useState(false);
  const [publicStories, setPublicStories] = useState(initialPublicStories);
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de "Ver Mais" Favoritos
  const filteredFavorites = useMemo(() => {
    if (!searchTerm) return initialFavorites;
    const term = searchTerm.toLowerCase();
    return initialFavorites.filter(fav =>
      fav.title.toLowerCase().includes(term) ||
      fav.author.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const visibleFavorites = showAllFavs ? filteredFavorites : filteredFavorites.slice(0, 3);

  // Lógica de filtro e ordenação
  const filteredAndSortedStories = useMemo(() => {
    let filtered = publicStories;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(story =>
        story.title.toLowerCase().includes(term) ||
        story.author.toLowerCase().includes(term)
      );
    }

    let sorted = [...filtered];
    switch (activeFilter) {
      case 'popular':
        sorted.sort((a, b) => b.likes - a.likes);
        break;
      case 'recentes':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'ordem a-z':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    return sorted;
  }, [publicStories, searchTerm, activeFilter]);

  // Lógica de Like
  const toggleLike = (e: React.MouseEvent, storyId: number) => {
    e.preventDefault();
    e.stopPropagation();

    setPublicStories(prev => prev.map(story => {
      if (story.id === storyId) {
        return {
          ...story,
          isLiked: !story.isLiked,
          likes: story.isLiked ? story.likes - 1 : story.likes + 1
        };
      }
      return story;
    }));
  };

  return (
    <div className={styles.etherContainer}>

      {/* --- SEÇÃO 1: FAVORITOS --- */}
      <section className={styles.favoritesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Sparkles size={18} style={{ display: 'inline', marginRight: '8px', color: 'var(--neon-purple)' }} />
            Seus Favoritos
          </h2>
          
          <button 
            className={styles.viewAllLink} 
            onClick={() => setShowAllFavs(!showAllFavs)}
            style={{ background: 'none', border: 'none', font: 'inherit' }}
          >
            {showAllFavs ? "Ver menos" : "Ver todos >"}
          </button>
        </div>

        <div className={styles.favGrid}>
          {visibleFavorites.length > 0 ? (
            visibleFavorites.map((fav) => (
              <div 
                key={fav.id} 
                className={styles.favCard}
                style={{ position: 'relative' }} // Importante para o overlay
              >
                {/* 1. LINK DA HISTÓRIA (Overlay Invisível) */}
                <Link 
                  href={`/reader/${fav.id}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
                />

                <div className={styles.favIcon} style={{ pointerEvents: 'none' }}>{fav.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', color: '#fff' }}>{fav.title}</div>
                  
                  {/* 2. LINK DO AUTOR (Z-Index maior para ficar em cima do overlay) */}
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 2 }}>
                    @<Link 
                        href={`/profile?user=${encodeURIComponent(fav.author)}`}
                        className={styles.authorLink}
                      >
                        {fav.author}
                      </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              Nenhum favorito encontrado
            </div>
          )}
        </div>
      </section>

      {/* --- SEÇÃO 2: O MULTIVERSO (FEED) --- */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Explorar Multiverso</h2>
        </div>

        {/* Barra de Controles */}
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <Search size={20} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Buscar universo, gênero ou autor..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            {['popular', 'recentes', 'ordem a-z'].map((filter) => (
              <button 
                key={filter}
                className={`${styles.filterTab} ${activeFilter === filter ? styles.filterActive : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'popular' ? 'Populares' : 
                 filter === 'recentes' ? 'Recentes' : 'Ordem A-Z'}
              </button>
            ))}
          </div>
        </div>

        {/* Contador */}
        {searchTerm && (
          <div style={{ marginTop: '16px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {filteredAndSortedStories.length} {filteredAndSortedStories.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </div>
        )}

        {/* Grid de Posters */}
        <div className={styles.publicGrid}>
          {filteredAndSortedStories.length > 0 ? (
            filteredAndSortedStories.map((story) => (
              <div key={story.id} className={styles.posterCard}>
                
                <div className={styles.posterCover}>
                  <div 
                    className={styles.gradientBg} 
                    style={{ background: story.gradient }}
                  />
                  
                  <div className={styles.hoverOverlay}>
                    <Link href={`/reader/${story.id}`}>
                      <button className={styles.actionBtn}>
                        <Play size={12} style={{ marginRight: '6px' }} />
                        Jogar Agora
                      </button>
                    </Link>
                  </div>
                </div>

                <div className={styles.posterContent}>
                  <div>
                    <h3 className={styles.posterTitle}>{story.title}</h3>
                    
                    <div className={styles.posterAuthor}>
                      por{' '}
                      <Link 
                        href={`/profile?user=${encodeURIComponent(story.author)}`}
                        className={styles.authorLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {story.author}
                      </Link>
                    </div>
                  </div>

                  <div className={styles.posterStats}>
                    <div className={styles.statItem}>
                      <Eye size={14} /> {story.views}
                    </div>
                    
                    <button 
                      onClick={(e) => toggleLike(e, story.id)}
                      className={styles.statItem}
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: story.isLiked ? 'var(--neon-red)' : 'var(--text-secondary)',
                        padding: 0, font: 'inherit'
                      }}
                    >
                      <Heart 
                        size={14} 
                        fill={story.isLiked ? "currentColor" : "none"} 
                        style={{ transition: 'transform 0.2s', transform: story.isLiked ? 'scale(1.2)' : 'scale(1)' }}
                      /> 
                      <span style={{ marginLeft: '6px' }}>{story.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <Search size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Nenhum universo encontrado</h3>
              <p style={{ fontSize: '14px' }}>Tente ajustar sua pesquisa ou filtros</p>
            </div>
          )}
        </div>

        {filteredAndSortedStories.length > 0 && (
          <button className={styles.loadMoreBtn}>
            Carregar mais sinais do espaço...
          </button>
        )}

      </section>
    </div>
  );
}