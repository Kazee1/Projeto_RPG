'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseClientregister';
import {
  Info, Dna, Zap, Shield, Sparkles, Minus, Plus,
  Globe, Lock, Loader2
} from 'lucide-react';
import styles from '@/styles/new-game.module.css';

// --- TIPAGEM FORTE PARA EVITAR ERROS TS ---
type SystemKey = 'dnd' | 'cyber' | 'vampire' | 'fallout';

interface RpgSystemDef {
  name: string;
  desc: string;
  skills: string[];
}

interface GameFormData {
  charName: string;
  title: string;
  system: SystemKey;
  difficulty: string;
  genres: string[];
  class: string;
  background: string;
  isPublic: boolean;
  attributes: Record<string, number>; // Resolve o erro de indexação e 'unknown'
}

// 1. DEFINIÇÃO DOS SISTEMAS
const rpgSystems: Record<SystemKey, RpgSystemDef> = {
  dnd: {
    name: "Dungeons & Dragons",
    desc: "Fantasia heróica com magia e combate tático",
    skills: ["forca", "destreza", "constituicao", "intelecto", "sabedoria", "carisma"],
  },
  cyber: {
    name: "Cyberpunk Red",
    desc: "Distopia tecnológica com corpo e mente modificados",
    skills: ["reflexos", "tecnica", "corpo", "intelecto", "vontade", "empatia"],
  },
  vampire: {
    name: "Vampire: The Masquerade",
    desc: "Horror urbano gótico com política vampírica",
    skills: ["fisico", "social", "mental", "presenca", "manipulacao", "carisma"],
  },
  fallout: {
    name: "Fallout RPG",
    desc: "Sobrevivência em wasteland radioativo",
    skills: ["forca", "percepcao", "resistencia", "carisma", "intelecto", "agilidade", "sorte"],
  }
};

// Configuração Visual dos Cards
const systemsUI = [
  { id: 'dnd', name: 'Dungeons & Dragons', desc: 'Fantasia heróica, magia e espadas.', icon: <Sparkles size={24} color="#fcd34d" /> },
  { id: 'cyber', name: 'Cyberpunk Red', desc: 'Alta tecnologia, baixa qualidade de vida.', icon: <Zap size={24} color="#22d3ee" /> },
  { id: 'vampire', name: 'Vampire: The Masquerade', desc: 'Horror pessoal e intriga política.', icon: <Dna size={24} color="#ef4444" /> },
  { id: 'fallout', name: 'Fallout / Wasteland', desc: 'Sobrevivência pós-apocalíptica.', icon: <Shield size={24} color="#84cc16" /> },
];

const classOptions: Record<string, string[]> = {
  dnd: ['Guerreiro', 'Mago', 'Ladino', 'Clérigo', 'Paladino', 'Bardo', 'Patrulheiro', 'Feiticeiro'],
  cyber: ['Solo (Mercenário)', 'Netrunner (Hacker)', 'Techie (Engenheiro)', 'Rockerboy', 'Nomad', 'Medtech', 'Corpo'],
  vampire: ['Brujah (Rebelde)', 'Toreador (Artista)', 'Ventrue (Líder)', 'Nosferatu (Espião)', 'Malkavian (Profeta)', 'Tremere (Feiticeiro)'],
  fallout: ['Vault Dweller', 'Brotherhood Initiate', 'Wasteland Doctor', 'Raider', 'Ghoul', 'Mercenary']
};

const difficulties = [
  { id: 'easy', label: 'Narrativa', class: styles.diffEasy },
  { id: 'normal', label: 'Normal', class: styles.diffNormal },
  { id: 'hard', label: 'Hard', class: styles.diffHard },
  { id: 'impossible', label: 'Pesadelo', class: styles.diffImpossible },
];

const allGenres = [
  "High Fantasy", "Dark Fantasy", "Cyberpunk", "Space Opera", "Pós-Apocalíptico",
  "Terror Cósmico", "Investigação Noir", "Steampunk", "Isekai", "Dungeon Crawler",
  "Horror de Sobrevivência", "Intriga Política", "Realismo Mágico", "Western",
  "Super-Heróis", "Viagem no Tempo", "Grimdark", "Mistério Gótico", "Espionagem",
  "Fantasia Urbana", "Mitologia Nórdica", "Mitologia Grega", "Fantasia Oriental",
  "Cultivação (Xianxia)", "LitRPG", "Romance Sobrenatural", "Apocalipse Zumbi",
  "Kaiju", "Mecha", "Thriller Psicológico", "Fantasia Sombria Medieval",
  "Sci-Fi Hard", "Sci-Fi Distópica", "Utopia Tecnológica", "Drama Histórico",
  "Piratas", "Exploração Espacial", "Sobrevivência na Natureza", "Magia Acadêmica"
];

// 2. DESCRIÇÕES DINÂMICAS (Tipada como Record<string, string> para aceitar chaves dinâmicas)
const skillDescriptions: Record<string, string> = {
  // D&D & Gerais
  forca: "Poder físico bruto, dano corpo a corpo e capacidade de carga.",
  destreza: "Agilidade, reflexos, equilíbrio e coordenação motora.",
  constituicao: "Saúde, vigor, resistência a venenos e fadiga.",
  intelecto: "Raciocínio lógico, memória e conhecimento arcano/tecnológico.",
  sabedoria: "Percepção, intuição, força de vontade e conexão divina.",
  carisma: "Força de personalidade, persuasão e liderança.",

  // Cyberpunk
  reflexos: "Tempo de reação e precisão em combate.",
  tecnica: "Habilidade com reparos, tecnologia e manuseio de equipamentos.",
  corpo: "Resistência física a dano, implantes e traumas.",
  vontade: "Resistência mental, coragem e determinação.",
  empatia: "Capacidade de se relacionar com outros e manter a humanidade.",

  // Vampiro
  fisico: "Atributos corporais gerais (Força/Destreza/Vigor).",
  social: "Capacidade de interação, etiqueta e influência em sociedade.",
  mental: "Capacidade cognitiva, astúcia e conhecimentos.",
  presenca: "Impacto imediato, magnetismo pessoal e intimidação.",
  manipulacao: "Capacidade de influenciar outros sutilmente ou com lábia.",

  // Fallout
  percepcao: "Atenção aos detalhes, mira e sentidos aguçados.",
  resistencia: "Capacidade de suportar radiação, fome e dano físico.",
  agilidade: "Velocidade de movimento e pontos de ação.",
  sorte: "O fator imprevisível que altera as probabilidades a seu favor."
};

const TOTAL_POOL = 15;
const MAX_VISUAL = 10;

export default function MindRenderNewGame() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Inicializa o estado COM a interface GameFormData
  const [formData, setFormData] = useState<GameFormData>({
    charName: '',
    title: '',
    system: 'dnd',
    difficulty: 'normal',
    genres: [], // Agora o TS sabe que é string[]
    class: 'Guerreiro',
    background: '',
    isPublic: false,
    // Inicializa atributos zerados baseados no D&D
    attributes: rpgSystems['dnd'].skills.reduce((acc, skill) => ({ ...acc, [skill]: 0 }), {} as Record<string, number>)
  });

  // Calcula pontos usados (agora seguro porque attributes é Record<string, number>)
  const pointsUsed = Object.values(formData.attributes).reduce((a, b) => a + b, 0);
  const pointsRemaining = TOTAL_POOL - pointsUsed;

  // 3. ATUALIZAÇÃO DINÂMICA
  useEffect(() => {
    const selectedSystemConfig = rpgSystems[formData.system];

    if (selectedSystemConfig) {
      // Cria novo objeto de atributos
      const newAttributes = selectedSystemConfig.skills.reduce((acc, skill) => {
        acc[skill] = 0;
        return acc;
      }, {} as Record<string, number>);

      setFormData(prev => ({
        ...prev,
        class: classOptions[prev.system][0],
        attributes: newAttributes
      }));
    }
  }, [formData.system]);

  const toggleGenre = (genre: string) => {
    setFormData(prev => {
      if (prev.genres.includes(genre)) return { ...prev, genres: prev.genres.filter(g => g !== genre) };
      if (prev.genres.length >= 5) return prev;
      return { ...prev, genres: [...prev.genres, genre] };
    });
  };

  const handleAttribute = (attr: string, change: number) => {
    const currentValue = formData.attributes[attr] || 0;
    if (change < 0 && currentValue <= 0) return;
    if (change > 0 && pointsRemaining <= 0) return;

    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: currentValue + change }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.charName.trim()) {
      alert("Identidade inválida. Por favor, nomeie seu avatar.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Sessão expirada. Reiniciando uplink...");
        router.push('/login');
        return;
      }

      const storyPayload = {
        user_id: user.id,
        character_name: formData.charName,
        title: formData.title || `A Saga de ${formData.charName}`,
        system: formData.system,
        class_name: formData.class,
        difficulty: formData.difficulty,
        background: formData.background,
        genres: formData.genres,
        attributes: formData.attributes,
        is_public: formData.isPublic,
      };

      const { data: story } = await supabase.from('stories').insert(storyPayload).select().single();

      // 2. Dispara o start (Fire and Forget)
      fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: story.id,
          character_name: formData.charName,
          class_name:     formData.class,
          system:         formData.system,
          difficulty:     formData.difficulty,
          genres:         formData.genres,
          background:     formData.background,
          attributes:     formData.attributes,
          
        })
      }).catch(e => console.log("Start disparado")); // Não espera, não trata erro

      // 3. Redireciona IMEDIATAMENTE
      router.push(`/game/${story.id}`);

    } catch (error) {
      console.error("Erro crítico na criação:", error);
      alert("Falha crítica ao renderizar universo. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Inicializar Nova Simulação</h1>
        <p className={styles.pageSubtitle}>Defina os parâmetros da realidade que você deseja renderizar.</p>
      </div>

      <div className={styles.setupGrid}>
        {/* COLUNA ESQUERDA */}
        <div>
          <div className={styles.genresWrapper}>
            <label className={styles.sectionLabel}>Sistema de Regras (Core)</label>
            <div className={styles.systemsGrid}>
              {systemsUI.map((sys) => (
                <div
                  key={sys.id}
                  className={`${styles.systemCard} ${formData.system === sys.id ? styles.systemActive : ''}`}
                  // Aqui usamos cast para garantir que o ID é um SystemKey válido
                  onClick={() => setFormData({ ...formData, system: sys.id as SystemKey })}
                >
                  <div className={styles.systemIcon}>{sys.icon}</div>
                  <span className={styles.systemName}>{sys.name}</span>
                  <span className={styles.systemDesc}>{sys.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.genresWrapper}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className={styles.sectionLabel} style={{ marginBottom: 0 }}>Tags de Gênero</label>
              <span style={{ fontSize: '13px', fontWeight: '600', color: formData.genres.length === 5 ? 'var(--neon-purple)' : 'var(--text-secondary)' }}>
                {formData.genres.length} <span style={{ opacity: 0.5 }}>/ 5</span>
              </span>
            </div>
            <div className={styles.genreCloud}>
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  className={`${styles.genreTag} ${formData.genres.includes(genre) ? styles.genreSelected : ''}`}
                  onClick={() => toggleGenre(genre)}
                  style={{
                    opacity: (formData.genres.length >= 5 && !formData.genres.includes(genre)) ? 0.4 : 1,
                    cursor: (formData.genres.length >= 5 && !formData.genres.includes(genre)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className={styles.formPanel}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nome do Personagem</label>
            <input
              type="text"
              className={styles.glassInput}
              placeholder="Ex: Kael, Unit-734..."
              value={formData.charName}
              onChange={(e) => setFormData({ ...formData, charName: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Título da Crônica (Opcional)</label>
            <input
              type="text"
              className={styles.glassInput}
              placeholder="Ex: A Queda de Night City"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Classe / Arquétipo</label>
            <select
              className={styles.glassInput}
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              style={{ cursor: 'pointer' }}
            >
              {classOptions[formData.system].map(cls => (
                <option key={cls} value={cls} style={{ background: '#000' }}>{cls}</option>
              ))}
            </select>
          </div>

          {/* ÁREA DE ATRIBUTOS DINÂMICA */}
          <div className={styles.inputGroup} style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <label className={styles.label} style={{ marginBottom: 0 }}>Atributos ({rpgSystems[formData.system].name})</label>
              <div style={{
                background: pointsRemaining === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(34, 211, 238, 0.1)',
                padding: '6px 12px', borderRadius: '20px',
                border: pointsRemaining === 0 ? '1px solid var(--neon-green)' : '1px solid var(--neon-cyan)'
              }}>
                <span style={{ fontSize: '13px', color: '#fff' }}>
                  Pontos: <strong style={{ color: pointsRemaining === 0 ? 'var(--neon-green)' : 'var(--neon-cyan)', fontSize: '15px' }}>{pointsRemaining}</strong> / {TOTAL_POOL}
                </span>
              </div>
            </div>

            {Object.keys(formData.attributes).map((key) => {
              const val = formData.attributes[key];
              const canAdd = pointsRemaining > 0;
              const canRemove = val > 0;

              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                  <div style={{ width: '140px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <span style={{ textTransform: 'capitalize', fontSize: '14px', fontWeight: '600', color: canRemove ? '#fff' : 'var(--text-secondary)' }}>
                      {key}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.2', marginTop: '2px' }}>
                      {skillDescriptions[key] || "Atributo chave."}
                    </span>
                  </div>

                  <button onClick={() => handleAttribute(key, -1)} disabled={!canRemove} style={{ background: 'none', border: '1px solid var(--glass-border)', color: canRemove ? '#fff' : 'rgba(255,255,255,0.2)', cursor: canRemove ? 'pointer' : 'not-allowed', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Minus size={14} /></button>

                  <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: `${(val / MAX_VISUAL) * 100}%`, height: '100%', background: val > 5 ? 'var(--neon-purple)' : 'var(--neon-cyan)', borderRadius: '4px', transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>

                  <span style={{ width: '30px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: val > 0 ? '#fff' : 'rgba(255,255,255,0.3)' }}>{val}</span>

                  <button onClick={() => handleAttribute(key, 1)} disabled={!canAdd} style={{ background: canAdd ? 'rgba(34, 211, 238, 0.1)' : 'transparent', border: canAdd ? '1px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)', color: canAdd ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.2)', cursor: canAdd ? 'pointer' : 'not-allowed', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={14} /></button>
                </div>
              )
            })}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Antecedentes (Background)</label>
            <textarea
              className={styles.glassInput}
              rows={4}
              placeholder="Quem é você? De onde veio? O que busca?"
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Nível de Desafio</label>
            <div className={styles.difficultyContainer}>
              {difficulties.map((diff) => (
                <button
                  key={diff.id}
                  className={`${styles.diffBtn} ${diff.class} ${formData.difficulty === diff.id ? styles.active : ''}`}
                  onClick={() => setFormData({ ...formData, difficulty: diff.id })}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Visibilidade da Crônica</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setFormData({ ...formData, isPublic: false })}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: !formData.isPublic ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                  background: !formData.isPublic ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                  color: !formData.isPublic ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Lock size={16} /> Privada (Solo)
              </button>
              <button
                onClick={() => setFormData({ ...formData, isPublic: true })}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: formData.isPublic ? '1px solid var(--neon-purple)' : '1px solid var(--glass-border)',
                  background: formData.isPublic ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                  color: formData.isPublic ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Globe size={16} /> Pública (Ether)
              </button>
            </div>
          </div>

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Loader2 className="spin" size={20} /> <span>SINCRONIZANDO...</span></div> : "RENDERIZAR UNIVERSO"}
          </button>
        </div>
      </div>
    </div>
  );
}