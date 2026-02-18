'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseClientregister';
import { 
  Trophy, Dice5, Clock, BookOpen, Camera, Zap, Shield, Crown, User, Star, Save, Loader2, ArrowLeft
} from 'lucide-react';
import styles from '@/styles/profile.module.css';

// --- TIPAGEM DO BANCO DE DADOS ---
interface UserProfile {
  id: string;
  username: string;
  avatar_color: string;
  level: number;
  experience: number;
  dice_rolled: number;
  critical_hits: number;
  simulation_hours: number;
  chronicles_created: number;
}

// --- DADOS ESTÁTICOS (Mocks) ---
const badges = [
  { id: 1, name: "O Iniciado", desc: "Criou sua primeira conta.", icon: <User />, unlocked: true },
  { id: 2, name: "Crítico!", desc: "Rolou um 20 natural.", icon: <Zap />, unlocked: true },
  { id: 3, name: "Dungeon Master", desc: "Mestrou 5 aventuras.", icon: <Crown />, unlocked: true },
  { id: 4, name: "Sobrevivente", desc: "Terminou uma campanha sem morrer.", icon: <Shield />, unlocked: false }, 
  { id: 5, name: "Viciado", desc: "Jogou por 100 horas.", icon: <Clock />, unlocked: false },
];

const avatars = [
  '#000000', '#4f46e5', '#db2777', '#059669', '#d97706',
  '#7c3aed', '#2563eb', '#dc2626', '#0891b2', '#475569'
];

export default function MindRenderProfile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parâmetros da URL
  const initialTab = searchParams.get('tab') || 'overview';
  const targetUsername = searchParams.get('user'); // Ex: ?user=Visitante
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Estados de Dados e UI
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado local da cor na edição
  const [selectedAvatar, setSelectedAvatar] = useState('#000000');

  // Estado de permissão: Sou eu ou é um visitante?
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // 1. BUSCAR DADOS DO PERFIL (Lógica Híbrida)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Pega o usuário logado atualmente (se houver)
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        let query = supabase.from('profiles').select('*');

        // LÓGICA DE ROTEAMENTO DE PERFIL
        if (targetUsername) {
          // CASO A: Visitando alguém específico pela URL
          query = query.eq('username', targetUsername);
        } else if (currentUser) {
          // CASO B: Vendo meu próprio perfil (sem params na URL)
          query = query.eq('id', currentUser.id);
        } else {
          // CASO C: Sem URL e Sem Login -> Manda pro Login
          router.push('/login');
          return;
        }

        const { data, error } = await query.single();

        if (error || !data) {
          console.error("Perfil não encontrado");
          setProfile(null);
        } else {
          setProfile(data);
          // Inicializa a cor do editor com a cor do banco
          if (data.avatar_color) setSelectedAvatar(data.avatar_color);

          // Verifica se o perfil carregado pertence ao usuário logado
          if (currentUser && data.id === currentUser.id) {
            setIsOwnProfile(true);
          } else {
            setIsOwnProfile(false);
          }
        }

      } catch (error) {
        console.error('Erro crítico ao carregar perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUsername, router]);

  // Sincroniza abas se a URL mudar
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // 2. SALVAR AVATAR (Protegido)
  const handleSaveAvatar = async () => {
    if (!profile || !isOwnProfile) return; // Segurança extra no frontend

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_color: selectedAvatar })
        .eq('id', profile.id);

      if (error) throw error;

      // Atualiza estado local imediatamente
      setProfile({ ...profile, avatar_color: selectedAvatar });
      setActiveTab('overview'); // Fecha o editor

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alteração. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Cálculos Visuais de XP
  const nextLevelXp = profile ? profile.level * 1000 : 1000;
  const xpPercentage = profile ? (profile.experience / nextLevelXp) * 100 : 0;

  // --- RENDERIZAÇÃO ---

  if (loading) {
    return (
      <div style={{ padding: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', gap: 10 }}>
        <Loader2 className="spin" size={24} /> Sincronizando dados neurais...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 50, color: '#fff', textAlign: 'center' }}>
        <h2>Perfil não encontrado</h2>
        <p style={{color: 'var(--text-secondary)', marginBottom: 20}}>O viajante que você procura não existe ou está perdido no Éter.</p>
        <button onClick={() => router.push('/home')} style={{ background: 'var(--neon-cyan)', border: 'none', padding: '10px 20px', borderRadius: 8, cursor:'pointer', fontWeight:'bold' }}>
          Voltar ao Nexus
        </button>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      
      {/* Botão Voltar (Aparece se estiver visitando outro perfil) */}
      {!isOwnProfile && (
        <button 
          onClick={() => router.push('/home')}
          style={{ 
            background: 'transparent', border: 'none', color: 'var(--text-secondary)', 
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} /> Voltar para Home
        </button>
      )}

      {/* 1. CABEÇALHO DO PERFIL */}
      <div className={styles.profileHeader}>
        
        {/* Avatar */}
        <div className={styles.largeAvatar}>
          <div 
            style={{ 
              width: '100%', height: '100%', 
              background: profile.avatar_color || '#000000', 
              borderRadius: '50%',
              transition: 'background 0.3s ease'
            }} 
          />
          
          {/* Botão de Editar (Só se for dono) */}
          {isOwnProfile && (
            <button 
              className={styles.editBadge} 
              title="Alterar Avatar"
              onClick={() => setActiveTab('avatar')}
            >
              <Camera size={16} />
            </button>
          )}
        </div>

        {/* Informações do Usuário */}
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <h1>{profile.username}</h1>
            <div className={styles.levelBadge}>
              <Star size={14} fill="currentColor" /> Nível {profile.level}
            </div>
          </div>
          
          <div className={styles.userStatsLine}>
            <span>{isOwnProfile ? "Sua Ficha" : "Ficha de Viajante"}</span>
            <span>•</span>
            <span style={{color: 'var(--neon-purple)'}}>Plano Pro</span>
          </div>

          {/* Barra de XP */}
          <div className={styles.xpContainer}>
            <div className={styles.xpInfo}>
              <span>EXP</span>
              <span>{profile.experience} / {nextLevelXp}</span>
            </div>
            <div className={styles.xpTrack}>
              <div className={styles.xpFill} style={{ width: `${xpPercentage}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTEÚDO DINÂMICO --- */}

      {/* ABA: EDITOR DE AVATAR (Só aparece se for dono e estiver na aba) */}
      {activeTab === 'avatar' && isOwnProfile && (
        <div style={{ marginBottom: '40px', animation: 'fadeIn 0.3s' }}>
          <h2 style={{ marginBottom: '16px', color:'#fff' }}>Escolha sua Identidade</h2>
          <div className={styles.badgesGrid} style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '16px' }}>
             <p style={{ gridColumn: '1/-1', color: 'var(--text-secondary)', fontSize: '14px' }}>
               Selecione a cor que representará sua aura no Nexus.
             </p>
             
             <div className={styles.avatarGrid}>
               {avatars.map((color) => (
                 <div 
                   key={color}
                   className={`${styles.avatarOption} ${selectedAvatar === color ? styles.selected : ''}`}
                   style={{ background: color }}
                   onClick={() => setSelectedAvatar(color)}
                 />
               ))}
             </div>
             
             <div style={{ gridColumn: '1/-1', marginTop: '24px', display: 'flex', gap: '12px' }}>
               <button 
                 onClick={handleSaveAvatar}
                 disabled={saving}
                 style={{ 
                   padding: '10px 24px', 
                   background: 'var(--neon-cyan)', 
                   border: 'none', 
                   borderRadius: '8px', 
                   cursor: saving ? 'not-allowed' : 'pointer', 
                   fontWeight: 'bold',
                   display: 'flex', alignItems: 'center', gap: 8,
                   opacity: saving ? 0.7 : 1
                 }}
               >
                 {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                 {saving ? 'Salvando...' : 'Salvar Alterações'}
               </button>

               <button 
                 onClick={() => {
                   setActiveTab('overview');
                   setSelectedAvatar(profile.avatar_color); // Reseta cor se cancelar
                 }}
                 disabled={saving}
                 style={{ 
                   padding: '10px 24px', 
                   background: 'transparent', 
                   border: '1px solid var(--glass-border)', 
                   color: '#fff', 
                   borderRadius: '8px', 
                   cursor: 'pointer' 
                 }}
               >
                 Cancelar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* ABA: VISÃO GERAL (Stats + Badges) - Visível para todos */}
      {(activeTab === 'overview' || activeTab === 'badges') && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <Dice5 size={16} style={{display:'inline', marginRight: 6}} />
                Dados Rolados
              </div>
              <div className={styles.statValue}>{profile.dice_rolled}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <Zap size={16} style={{display:'inline', marginRight: 6}} />
                Críticos (Nat 20)
              </div>
              <div className={styles.statValue} style={{color: 'var(--neon-cyan)'}}>
                {profile.critical_hits}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <Clock size={16} style={{display:'inline', marginRight: 6}} />
                Horas Simuladas
              </div>
              <div className={styles.statValue}>{Math.floor(profile.simulation_hours)}h</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <BookOpen size={16} style={{display:'inline', marginRight: 6}} />
                Crônicas Criadas
              </div>
              <div className={styles.statValue}>{profile.chronicles_created}</div>
            </div>
          </div>

          <div className={styles.badgesSection} id="badges">
            <h2>
              <Trophy color="var(--neon-purple)" />
              Conquistas e Medalhas
            </h2>
            
            <div className={styles.badgesGrid}>
              {badges.map((badge) => (
                <div 
                  key={badge.id} 
                  className={`${styles.badgeCard} ${badge.unlocked ? styles.badgeUnlocked : ''}`}
                >
                  <div className={styles.badgeIcon} style={{ color: badge.unlocked ? 'gold' : 'inherit' }}>
                    {badge.icon}
                  </div>
                  <div>
                    <div className={styles.badgeName}>{badge.name}</div>
                    <div className={styles.badgeDesc}>{badge.desc}</div>
                  </div>
                  {!badge.unlocked && <div style={{ fontSize: '10px', marginTop: '4px' }}>🔒 Bloqueado</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}