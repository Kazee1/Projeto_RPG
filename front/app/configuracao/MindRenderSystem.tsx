'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/supabaseClientregister';
import {
  Volume2,
  Cpu,
  User,
  ShieldAlert,
  Loader2,
  Save
} from 'lucide-react';
import styles from '@/styles/system.module.css';

// Tipagem das Configurações do Banco
interface UserSettings {
  text_speed: number;
  gm_verbosity: number;
  sfx_enabled: boolean;
  music_volume: number;
}

export default function MindRenderSystem() {
  // Define Gameplay como a aba inicial padrão já que removemos Interface
  const [activeTab, setActiveTab] = useState('gameplay');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados do Usuário
  const [identity, setIdentity] = useState({ username: '', email: '' });

  // Configurações (Valores padrão iniciais)
  const [settings, setSettings] = useState<UserSettings>({
    text_speed: 50,
    gm_verbosity: 50,
    sfx_enabled: true,
    music_volume: 80,
  });

  // 1. BUSCAR DADOS DO BANCO
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Busca Configurações
        const { data: configData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Busca Perfil (para Identidade)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (configData) {
          setSettings({
            text_speed: configData.text_speed,
            gm_verbosity: configData.gm_verbosity,
            sfx_enabled: configData.sfx_enabled,
            music_volume: configData.music_volume
          });
        }

        if (profileData) {
          setIdentity({
            username: profileData.username || 'Viajante',
            email: user.email || ''
          });
        }

      } catch (error) {
        console.error("Erro ao carregar configs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. FUNÇÃO UNIFICADA DE UPDATE (AUTO-SAVE)
  const updateSetting = async (key: keyof UserSettings, value: any) => {
    // 1. Atualização Otimista (UI muda na hora)
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Envia para o Banco
      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
      // Opcional: Reverter estado em caso de erro
    } finally {
      // Pequeno delay visual para mostrar que salvou
      setTimeout(() => setSaving(false), 500);
    }
  };

  // Helper para converter Int do banco para String do Select (Verbosidade)
  const getVerbosityString = (val: number) => {
    if (val <= 30) return 'concise';
    if (val >= 70) return 'verbose';
    return 'balanced';
  };

  const setVerbosityFromStr = (val: string) => {
    let num = 50;
    if (val === 'concise') num = 25;
    if (val === 'verbose') num = 80;
    updateSetting('gm_verbosity', num);
  };

  // Componente Auxiliar de Toggle
  const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <div
      className={`${styles.toggleSwitch} ${active ? styles.toggleActive : ''}`}
      onClick={onClick}
    >
      <div className={styles.toggleHandle}></div>
    </div>
  );

  if (loading) {
    return <div className={styles.systemContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Loader2 className="spin" size={32} color="var(--neon-cyan)" />
    </div>;
  }

  return (
    <div className={styles.systemContainer}>

      {/* 1. Sidebar de Categorias */}
      <div className={styles.sidebarSettings}>
        {/* INTERFACE REMOVIDA */}

        <button
          className={`${styles.tabBtn} ${activeTab === 'gameplay' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('gameplay')}
        >
          <Cpu size={18} /> Processamento
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'audio' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          <Volume2 size={18} /> Sintetizador Áudio
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'account' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <User size={18} /> Identidade
        </button>

        {/* Indicador de Salvamento (Aparece no canto inferior da sidebar) */}
        {saving && (
          <div style={{
            marginTop: 'auto', padding: '20px', fontSize: '12px',
            color: 'var(--neon-cyan)', display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.7
          }}>
            <Save size={12} /> Salvando...
          </div>
        )}
      </div>

      {/* 2. Área de Conteúdo */}
      <div className={styles.contentArea}>

        {/* --- ABA: GAMEPLAY / CPU --- */}
        {activeTab === 'gameplay' && (
          <div className="animate-fade-in">
            <h2 className={styles.sectionTitle}>
              <Cpu className="text-green-400" /> Núcleo de Jogo
            </h2>
            <p className={styles.sectionDesc}>Parâmetros de geração da Inteligência Artificial.</p>

            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <h4>Velocidade de Texto</h4>
                <p>Quão rápido a narrativa é "digitada" na tela.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#fff' }}>Lento</span>

                {/* AQUI ESTÁ O SEGREDO: text_speed (com underline) */}
                <input
                  type="range" min="10" max="100"
                  value={settings.text_speed}
                  onChange={(e) => updateSetting('text_speed', parseInt(e.target.value))}
                  // Adicione isso para garantir que salve ao soltar o mouse
                  onMouseUp={(e) => updateSetting('text_speed', parseInt((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => updateSetting('text_speed', parseInt((e.target as HTMLInputElement).value))}
                  className={styles.rangeInput}
                />

                <span style={{ fontSize: '12px', color: '#fff' }}>Rápido</span>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <h4>Verbosidade do Mestre (AI)</h4>
                <p>Nível de detalhe nas descrições.</p>
              </div>
              <select
                className={styles.selectInput}
                value={getVerbosityString(settings.gm_verbosity)}
                onChange={(e) => setVerbosityFromStr(e.target.value)}
              >
                <option value="concise">Conciso (Direto ao ponto)</option>
                <option value="balanced">Equilibrado (Padrão)</option>
                <option value="verbose">Novelista (Descrições longas)</option>
              </select>
            </div>
          </div>
        )}

        {/* --- ABA: AUDIO --- */}
        {activeTab === 'audio' && (
          <div className="animate-fade-in">
            <h2 className={styles.sectionTitle}>
              <Volume2 className="text-purple-400" /> Sintetizador
            </h2>
            <p className={styles.sectionDesc}>Controle os estímulos auditivos da simulação.</p>

            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <h4>Efeitos Sonoros (SFX)</h4>
                <p>Sons de digitação e interface.</p>
              </div>
              <Toggle
                active={settings.sfx_enabled}
                onClick={() => updateSetting('sfx_enabled', !settings.sfx_enabled)}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <h4>Volume da Música Ambiente</h4>
                <p>Trilha sonora procedural.</p>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={settings.music_volume}
                onChange={(e) => updateSetting('music_volume', parseInt(e.target.value))}
                className={styles.rangeInput}
              />
            </div>
          </div>
        )}

        {/* --- ABA: CONTA --- */}
        {activeTab === 'account' && (
          <div className="animate-fade-in">
            <h2 className={styles.sectionTitle}>
              <User className="text-red-400" /> Identidade
            </h2>
            <p className={styles.sectionDesc}>Dados do seu avatar no mundo real.</p>

            <div className={styles.settingGroup}>
              <label className={styles.groupLabel}>Nome de Viajante</label>
              <input
                type="text"
                value={identity.username}
                readOnly
                className={styles.selectInput}
                style={{ width: '100%', cursor: 'default', opacity: 0.7 }}
              />
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.groupLabel}>Email de Acesso</label>
              <input
                type="email"
                value={identity.email}
                readOnly
                className={styles.selectInput}
                style={{ width: '100%', cursor: 'default', opacity: 0.7 }}
              />
            </div>

            {/* ZONA DE PERIGO (Visual Only por enquanto) */}
            <div className={styles.dangerZone}>
              <div className={styles.dangerTitle}>
                <ShieldAlert size={20} /> ZONA DE RISCO
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.8)', marginBottom: '16px' }}>
                Estas ações são irreversíveis e apagarão suas crônicas da existência.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className={styles.dangerBtn} onClick={() => alert('Função de reset em desenvolvimento.')}>
                  Resetar Progresso
                </button>
                <button className={styles.dangerBtn} onClick={() => alert('Entre em contato com o suporte para deletar a conta.')}>
                  Excluir Conta
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}