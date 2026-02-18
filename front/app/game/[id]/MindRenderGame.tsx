'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseClientregister';
import {
  MapPin, Hexagon, Coins, Backpack, ChevronDown,
  ChevronUp, Sword, User, TrendingUp, Loader2,
  Lock as LockIcon, Swords, Eye, MessageSquare, Footprints,
  ScrollText, Zap
} from 'lucide-react';
import styles from '@/styles/game.module.css';
import DiceRoller2D from './DiceRoller2D';

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Sender = 'narrator' | 'player' | 'system';
type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface Message {
  id: number;
  sender: Sender;
  text: string;
  roll?: number;
}

interface Item {
  id: string;
  name: string;
  quantity: number;
  description: string;
  value: number;
  type: string;
  effect_data: Record<string, any>;
}

interface EquipmentItem {
  id: string;
  slot: string;
  name: string;
  description?: string;
  stats: Record<string, any>;
  icon: string;
}

interface Choice {
  id: number;
  text: string;
  type: 'action' | 'investigate' | 'social' | 'stealth';
  skillCheck?: string;
  difficulty?: number;
  diceType?: DiceType;
}

interface CharacterStats {
  name: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  gold: number;
  xp: number;
}

interface StatusEffect {
  id: string;
  label: string;
  hp_per_turn?: number;
  atk_bonus?: number;
  def_bonus?: number;
  turns_remaining: number;
  source: string;
}

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────
const TypewriterMessage = ({
  text, speed = 20, onComplete, onTick,
}: {
  text: string; speed?: number; onComplete?: () => void; onTick?: () => void;
}) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const id = setInterval(() => {
      if (i >= text.length) { clearInterval(id); onComplete?.(); return; }
      setDisplayedText(p => p + text.charAt(i));
      onTick?.();
      i++;
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <div style={{ whiteSpace: 'pre-line' }}>{displayedText}</div>;
};

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.tooltipContainer}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && <div className={styles.tooltip}>{text}</div>}
    </div>
  );
};

// ─── STATUS EFFECT BADGE ──────────────────────────────────────────────────────
const StatusBadge = ({ effect }: { effect: StatusEffect }) => {
  const isPositive = (effect.hp_per_turn ?? 0) > 0 || (effect.atk_bonus ?? 0) > 0 || (effect.def_bonus ?? 0) > 0;
  const color = isPositive ? '#10b981' : '#ef4444';
  const parts: string[] = [];
  if (effect.hp_per_turn) parts.push(`${effect.hp_per_turn > 0 ? '+' : ''}${effect.hp_per_turn}HP`);
  if (effect.atk_bonus) parts.push(`${effect.atk_bonus > 0 ? '+' : ''}${effect.atk_bonus}ATK`);
  if (effect.def_bonus) parts.push(`${effect.def_bonus > 0 ? '+' : ''}${effect.def_bonus}DEF`);

  return (
    <Tooltip text={`${effect.label} (${effect.turns_remaining} turno(s)) • ${effect.source}`}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: `${color}22`, border: `1px solid ${color}44`,
        borderRadius: 6, padding: '4px 8px', fontSize: 10, color,
        fontWeight: 700, cursor: 'default',
      }}>
        <Zap size={10} />
        <span>{effect.label}</span>
        {parts.length > 0 && <span style={{ color: '#9ca3af' }}>({parts.join(' ')})</span>}
        <span style={{ color: '#6b7280', fontSize: 9 }}>{effect.turns_remaining}t</span>
      </div>
    </Tooltip>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MindRenderGame() {
  const params = useParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // bloqueia choices enquanto n8n processa

  // Dados
  const [messages, setMessages] = useState<Message[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [character, setCharacter] = useState<CharacterStats | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [inventory, setInventory] = useState<Item[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [location, setLocation] = useState('');
  const [quests, setQuests] = useState<string[]>([]);
  const [statusFx, setStatusFx] = useState<StatusEffect[]>([]);

  // UI
  const [uiState, setUiState] = useState({ stats: false, equipment: false, inventory: false, quests: true });
  const toggleUi = (key: keyof typeof uiState) => setUiState(p => ({ ...p, [key]: !p[key] }));

  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [hasSeenMessages, setHasSeenMessages] = useState<Set<number>>(new Set());

  // Dice
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [currentDiceType, setCurrentDiceType] = useState<DiceType>('d20');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [currentChoice, setCurrentChoice] = useState<Choice | null>(null);

  // Contador para triggerStorySummary — 5 pares (player+narrator) = 10 msgs
  const pairCountRef = useRef(0);

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    if (!scrollRef.current) return;
    const { scrollHeight, clientHeight } = scrollRef.current;
    scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const renderItemStats = (item: EquipmentItem) => {
    const s = item.stats ?? {};
    const parts: string[] = [];
    if (s.armor || s.defense) parts.push(`+${s.armor ?? s.defense} CA`);
    if (s.damage) parts.push(`Dano: ${s.damage}`);
    if (s.heal) parts.push(`Cura: ${s.heal}`);
    if (parts.length === 0 && s.effect) parts.push(s.effect);
    return parts.join(' • ') || 'Equipado';
  };

  const triggerStorySummary = useCallback(async () => {
    try {
      await fetch('/api/game/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: params.id }),
      });
    } catch (err) {
      console.error('Failed to trigger summary:', err);
    }
  }, [params.id]);

  // ─── LOAD INICIAL ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadGameData = async () => {
      try {
        if (!params.id) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: story, error: storyError } = await supabase
          .from('stories').select('*').eq('id', params.id).single();
        if (storyError || !story) throw storyError;
        if (story.user_id !== user.id) { setAccessDenied(true); setLoading(false); return; }

        // Equipamento
        const { data: equipData } = await supabase.from('equipment').select('*').eq('story_id', params.id);
        setEquipment(equipData ?? []);

        // Character — usa armor_class do banco (calculado pelo backend)
        setCharacter({
          name: story.character_name,
          class: story.class_name,
          level: story.level ?? 1,
          hp: story.hp_current ?? 10,
          maxHp: story.hp_max ?? 10,
          ac: story.armor_class ?? 10,
          gold: story.gold ?? 0,
          xp: story.experience ?? 0,
        });
        setStats(story.attributes ?? {});
        setLocation(story.current_location ?? '');
        setQuests(Array.isArray(story.active_quests) ? story.active_quests : []);
        setStatusFx(Array.isArray(story.status_effects) ? story.status_effects : []);

        // Mensagens
        const { data: msgData } = await supabase
          .from('messages').select('*').eq('story_id', params.id).order('created_at', { ascending: true });

        if (msgData) {
          const formatted: Message[] = msgData.map((m: any) => ({
            id: m.id, sender: m.sender as Sender, text: m.content, roll: m.roll_result,
          }));
          setMessages(formatted);

          // Conta pares já existentes para o resumo
          const playerCount = formatted.filter(m => m.sender === 'player').length;
          pairCountRef.current = playerCount;

          // Marca como vistas todas menos a última do narrador
          const seenSet = new Set<number>(formatted.map(m => m.id));
          const lastNarrator = [...formatted].reverse().find(m => m.sender === 'narrator');
          if (lastNarrator) seenSet.delete(lastNarrator.id);
          setHasSeenMessages(seenSet);

          // Mostra choices se a última msg for do narrador
          if (formatted.length > 0 && formatted[formatted.length - 1].sender === 'narrator') {
            setShowChoices(true);
          }
        }

        // Inventário
        const { data: itemsData } = await supabase.from('items').select('*').eq('story_id', params.id);
        if (itemsData) setInventory(itemsData);

        // Choices ativas
        const { data: choicesData } = await supabase
          .from('choices').select('*').eq('story_id', params.id).eq('is_chosen', false);
        if (choicesData) {
          setChoices(choicesData.map((c: any) => ({
            id: c.id, text: c.text, type: c.type,
            skillCheck: c.skill_check, difficulty: c.difficulty, diceType: c.dice_type,
          })));
        }

      } catch (err) {
        console.error('loadGameData error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGameData();

    // ─── REALTIME ────────────────────────────────────────────────────────────
    const channel = supabase
      .channel(`game-${params.id}`)

      // 1. Nova mensagem do narrador ou sistema
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `story_id=eq.${params.id}`,
      }, (payload) => {
        const m = payload.new as any;

        setMessages(prev => {
          // Evita duplicata (player já foi inserido localmente)
          if (prev.some(msg => msg.id === m.id)) return prev;
          return [...prev, {
            id: m.id,
            sender: m.sender as Sender,
            text: m.content,
            roll: m.roll_result,
          }];
        });

        if (m.sender === 'narrator') {
          // Carrega as choices novas que o n8n inseriu
          supabase
            .from('choices')
            .select('*')
            .eq('story_id', params.id)
            .eq('is_chosen', false)
            .then(({ data }) => {
              if (data) {
                setChoices(data.map((c: any) => ({
                  id: c.id,
                  text: c.text,
                  type: c.type,
                  skillCheck: c.skill_check,
                  difficulty: c.difficulty,
                  diceType: c.dice_type,
                })));
              }
            });

          // Conta pares para resumo
          pairCountRef.current += 1;
          if (pairCountRef.current > 0 && pairCountRef.current % 5 === 0) {
            triggerStorySummary();
          }

          setIsTyping(true);
          setShowChoices(false);
          setIsProcessing(false);
        }
      })

      // 2. Nova choice inserida pelo n8n
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'choices',
        filter: `story_id=eq.${params.id}`,
      }, (payload) => {
        const c = payload.new as any;
        setChoices(prev => {
          if (prev.some(ch => ch.id === c.id)) return prev;
          return [...prev, {
            id: c.id, text: c.text, type: c.type,
            skillCheck: c.skill_check, difficulty: c.difficulty, diceType: c.dice_type,
          }];
        });
      })

      // 3. stories UPDATE — HP, gold, XP, location, quests, status_effects, AC
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'stories',
        filter: `id=eq.${params.id}`,
      }, (payload) => {
        const s = payload.new as any;
        setCharacter(prev => prev ? ({
          ...prev,
          hp: s.hp_current ?? prev.hp,
          maxHp: s.hp_max ?? prev.maxHp,
          ac: s.armor_class ?? prev.ac,
          gold: s.gold ?? prev.gold,
          xp: s.experience ?? prev.xp,
          level: s.level ?? prev.level,
        }) : null);
        if (s.current_location) setLocation(s.current_location);
        if (Array.isArray(s.active_quests)) setQuests(s.active_quests);
        if (Array.isArray(s.status_effects)) setStatusFx(s.status_effects);
      })

      // 4. Novo item no inventário
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'items',
        filter: `story_id=eq.${params.id}`,
      }, (payload) => {
        const item = payload.new as Item;
        setInventory(prev => {
          if (prev.some(i => i.id === item.id)) return prev;
          // Notificação inline no chat
          setMessages(msgs => [...msgs, {
            id: Date.now(),
            sender: 'system',
            text: `📦 ${item.name} adicionado ao inventário`,
          }]);
          return [...prev, item];
        });
      })

      // 5. Item removido (consumido/descartado pelo n8n)
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'items',
        filter: `story_id=eq.${params.id}`,
      }, (payload) => {
        const old = payload.old as any;
        setInventory(prev => prev.filter(i => i.id !== old.id));
      })

      // 6. Equipamento atualizado (pelo front ou por evento futuro)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'equipment',
        filter: `story_id=eq.${params.id}`,
      }, async () => {
        const { data } = await supabase.from('equipment').select('*').eq('story_id', params.id);
        setEquipment(data ?? []);
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id, router, triggerStorySummary]);

  // Scroll automático
  useEffect(() => {
    if (!loading && messages.length > 0) setTimeout(() => scrollToBottom(false), 100);
  }, [loading]);

  useEffect(() => {
    if (showChoices) {
      setTimeout(() => scrollToBottom(true), 100);
      setTimeout(() => scrollToBottom(true), 450);
    }
  }, [showChoices]);

  // ─── AÇÕES ────────────────────────────────────────────────────────────────

  // Usar item de cura direto do inventário
  const handleUseItem = async (item: Item) => {
    if (!character || !item.effect_data?.heal) return;
    const heal = item.effect_data.heal as number;
    const newHp = Math.min(character.hp + heal, character.maxHp);

    setCharacter(p => p ? { ...p, hp: newHp } : null);
    await supabase.from('stories').update({ hp_current: newHp }).eq('id', params.id);

    if (item.quantity > 1) {
      const newQtd = item.quantity - 1;
      setInventory(p => p.map(i => i.id === item.id ? { ...i, quantity: newQtd } : i));
      await supabase.from('items').update({ quantity: newQtd }).eq('id', item.id);
    } else {
      setInventory(p => p.filter(i => i.id !== item.id));
      await supabase.from('items').delete().eq('id', item.id);
    }

    setMessages(p => [...p, {
      id: Date.now(), sender: 'system',
      text: `🧪 Você usou ${item.name} e recuperou ${heal} HP.`,
    }]);
  };
  const handleChoice = async (choice: Choice) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setChoices([]);
    setShowChoices(false);

    let rollValue: number | null = null;

    if (choice.skillCheck && choice.diceType) {
      const max = parseInt(choice.diceType.substring(1));
      rollValue = Math.floor(Math.random() * max) + 1;

      setCurrentChoice(choice);
      setCurrentDiceType(choice.diceType);
      setDiceResult(null);
      setIsRolling(true);
      setShowDiceOverlay(true);

      await new Promise(resolve => setTimeout(resolve, 1500));
      setDiceResult(rollValue);
      setIsRolling(false);
    }

    // 1. Insere no Supabase — roll_result é INTEGER, salva só o número
    const { data: insertedMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        story_id: params.id,
        sender: 'player',
        content: choice.text,
        roll_result: rollValue, // ← só o número, não o objeto
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir mensagem do player:', insertError);
      setIsProcessing(false);
      return;
    }

    // 2. Marca choices antigas como escolhidas
    await supabase
      .from('choices')
      .update({ is_chosen: true })
      .eq('story_id', params.id);

    // 3. Adiciona mensagem localmente para UX imediata
    setMessages(p => [...p, {
      id: insertedMsg.id,
      sender: 'player',
      text: choice.text,
      roll: rollValue ?? undefined,
    }]);

    if (rollValue !== null) {
      setMessages(p => [...p, {
        id: Date.now(),
        sender: 'system',
        text: `🎲 ${rollValue} vs DC ${choice.difficulty ?? '?'} — ${rollValue >= (choice.difficulty ?? 0) ? '✅ Sucesso' : '❌ Falha'}`,
      }]);
    }

    // 4. Dispara o n8n — manda o objeto completo só aqui, não pro banco
    fetch('/api/game/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        story_id: params.id,
        choice_text: choice.text,
        choice_type: choice.type,
        skill_check: choice.skillCheck,
        difficulty: choice.difficulty,
        dice_type: choice.diceType,
        // objeto completo só para o n8n processar
        roll_result: rollValue !== null ? {
          total: rollValue,
          roll: rollValue,
          difficulty: choice.difficulty ?? 10,
          success: rollValue >= (choice.difficulty ?? 10),
          is_critical: rollValue === parseInt((choice.diceType ?? 'd20').substring(1)),
        } : null,
      }),
    }).catch(err => console.error('Erro ao chamar continue:', err));
  };

  const handleAnimationComplete = () => {
    if (diceResult === null || !currentChoice) return;
    setShowDiceOverlay(false);
  };

  const handleTypingComplete = () => {
    setIsTyping(false);
    if (choices.length > 0) setShowChoices(true);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  if (accessDenied) return (
    <div className={styles.centered}>
      <LockIcon size={64} /><h1>Acesso Negado</h1>
    </div>
  );
  if (loading || !character) return (
    <div className={styles.centered}>
      <Loader2 className="spin" size={48} />
    </div>
  );

  const hpPct = (character.hp / character.maxHp) * 100;
  const xpToNext = character.level * 1000;
  const xpPct = (character.xp / xpToNext) * 100;
  const hpColor = hpPct > 60 ? '#ef4444' : hpPct > 25 ? '#f97316' : '#7f1d1d';

  return (
    <div className={styles.gameContainer}>
      {showDiceOverlay && (
        <DiceRoller2D
          isRolling={isRolling}
          result={diceResult}
          diceType={currentDiceType}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* ── ÁREA CENTRAL ──────────────────────────────────────────────── */}
      <div className={styles.mainArea}>
        {/* Header — local + processando */}
        <div className={styles.sceneHeader}>
          <div className={styles.locationTitle}>
            <MapPin size={16} />
            <span>{location || character.name}</span>
          </div>
          {isProcessing && (
            <div className={styles.processingBadge}>
              <Loader2 size={12} className="spin" />
              <span>Narrando…</span>
            </div>
          )}
        </div>

        <div className={`${styles.contentSplit} ${showChoices ? styles.splitMode : styles.fullMode}`}>
          {/* Log de mensagens */}
          <div className={styles.logContainer} ref={scrollRef}>
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1 && msg.sender === 'narrator';
              const shouldType = isLast && !hasSeenMessages.has(msg.id);

              return (
                <div
                  key={msg.id}
                  className={
                    msg.sender === 'narrator' ? styles.msgNarrator :
                      msg.sender === 'player' ? styles.msgPlayer :
                        styles.msgSystem
                  }
                >
                  {msg.sender === 'system' && <Hexagon size={14} className="mr-2" />}
                  {msg.sender === 'narrator' && <div className={styles.senderName}>Mestre</div>}
                  {shouldType ? (
                    <TypewriterMessage
                      text={msg.text}
                      speed={20}
                      onTick={() => scrollToBottom(true)}
                      onComplete={() => {
                        setHasSeenMessages(p => new Set(p).add(msg.id));
                        handleTypingComplete();
                      }}
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                  )}
                </div>
              );
            })}

            {/* Indicador de digitação enquanto espera a IA */}
            {isProcessing && !isTyping && (
              <div className={styles.msgSystem}>
                <Loader2 size={12} className="spin" style={{ marginRight: 6 }} />
                O Mestre está narrando…
              </div>
            )}
          </div>

          {/* Choices */}
          {showChoices && (
            <div className={styles.optionsArea}>
              <div className={styles.choicesScrollContainer}>
                {choices.map(choice => {
                  const Icon =
                    choice.type === 'investigate' ? Eye :
                      choice.type === 'social' ? MessageSquare :
                        choice.type === 'stealth' ? Footprints :
                          Swords;

                  return (
                    <button
                      key={choice.id}
                      className={styles.optionBtn}
                      onClick={() => handleChoice(choice)}
                      disabled={showDiceOverlay || isProcessing}
                      data-type={choice.type}
                    >
                      <div className={styles.optionIcon}><Icon size={18} /></div>
                      <div className={styles.optionContent}>
                        <span className={styles.optionText}>{choice.text}</span>
                        <span className={styles.optionMeta}>
                          {choice.type.toUpperCase()}
                          {choice.skillCheck && ` • ${choice.skillCheck.toUpperCase()}`}
                        </span>
                      </div>
                      {choice.skillCheck && (
                        <div className={styles.rollBadge}>
                          <span>{choice.diceType}</span>
                          DC {choice.difficulty}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HUD SIDEBAR ───────────────────────────────────────────────── */}
      <aside className={styles.hudSidebar}>
        <div className={styles.hudScrollableContent}>

          {/* Cabeçalho do personagem */}
          <div className={styles.characterHeader}>
            <div className={styles.avatarPlaceholder}><User size={24} /></div>
            <div className={styles.characterInfo}>
              <div className={styles.characterName}>{character.name}</div>
              <div className={styles.characterClass}>{character.class} • Nv.{character.level}</div>
            </div>
          </div>

          {/* HP + CA */}
          <div className={styles.vitalStats}>
            <div className={styles.hpCard}>
              <div className={styles.hpLabel}>Vida</div>
              <div className={styles.hpValues}>
                <span className={styles.hpCurrent}>{character.hp}</span>
                <span className={styles.hpMax}>/{character.maxHp}</span>
              </div>
              <div className={styles.hpBar}>
                <div className={styles.hpFill} style={{ width: `${hpPct}%`, background: hpColor }} />
              </div>
            </div>
            <div className={styles.acCard}>
              <div className={styles.acValue}>{character.ac}</div>
              <div className={styles.acLabel}>Defesa</div>
            </div>
          </div>

          {/* XP */}
          <div className={styles.xpContainer}>
            <div className={styles.xpBarBg}>
              <div className={styles.xpBarFill} style={{ width: `${xpPct}%` }} />
            </div>
            <div className={styles.xpText}>{character.xp} / {xpToNext} XP</div>
          </div>

          {/* Efeitos de status ativos */}
          {statusFx.length > 0 && (
            <div className={styles.statusEffectsRow}>
              {statusFx.map(ef => <StatusBadge key={ef.id} effect={ef} />)}
            </div>
          )}

          {/* Missões + Local */}
          <div className={styles.hudSection}>
            <div className={styles.sectionHeader} onClick={() => toggleUi('quests')}>
              <div className={styles.sectionTitle}><ScrollText size={12} /> Missões</div>
              {uiState.quests ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            {uiState.quests && (
              <div className={styles.sectionBody}>
                {/* Local atual */}
                {location && (
                  <div className={styles.locationRow}>
                    <MapPin size={11} style={{ color: '#22d3ee', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#e5e7eb' }}>{location}</span>
                  </div>
                )}
                {/* Lista de missões */}
                {quests.length === 0 ? (
                  <div className={styles.emptyState}>Nenhuma missão ativa</div>
                ) : (
                  quests.map((q, i) => (
                    <div key={i} className={styles.questRow}>
                      <span className={styles.questBullet}>◆</span>
                      <span style={{ fontSize: 12, color: '#e5e7eb', lineHeight: 1.4 }}>{q}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Atributos */}
          <div className={styles.hudSection}>
            <div className={styles.sectionHeader} onClick={() => toggleUi('stats')}>
              <div className={styles.sectionTitle}><TrendingUp size={12} /> Atributos</div>
              {uiState.stats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            {uiState.stats && (
              <div className={styles.sectionBody}>
                <div className={styles.statsGrid}>
                  {Object.entries(stats).map(([k, v]) => {
                    const mod = Math.floor(((v as number) - 10) / 2);
                    return (
                      <div key={k} className={styles.statItem}>
                        <span className={styles.statName}>{k.substring(0, 3)}</span>
                        <div className={styles.statValueContainer}>
                          <span className={styles.statValue}>{v as number}</span>
                          <span className={styles.statModifier}>{mod >= 0 ? '+' : ''}{mod}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Equipamento */}
          <div className={styles.hudSection}>
            <div className={styles.sectionHeader} onClick={() => toggleUi('equipment')}>
              <div className={styles.sectionTitle}><Sword size={12} /> Equipamento</div>
              {uiState.equipment ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            {uiState.equipment && (
              <div className={styles.sectionBody}>
                {equipment.length === 0 ? (
                  <div className={styles.emptyState}>Vazio</div>
                ) : (
                  equipment.map(item => (
                    <div key={item.id} className={styles.equipmentRow}>
                      <Tooltip text={item.description ?? 'Equipado'}>
                        <div className={styles.itemCard}>
                          <div className={styles.itemIcon}>{item.icon ?? '🛡️'}</div>
                          <div className={styles.itemInfo}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className={styles.itemName}>{item.name}</span>
                              <span style={{ color: 'var(--neon-cyan)', fontSize: 9, textTransform: 'uppercase' }}>{item.slot}</span>
                            </div>
                            <span className={styles.itemSub}>{renderItemStats(item)}</span>
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Inventário */}
          <div className={styles.hudSection}>
            <div className={styles.sectionHeader} onClick={() => toggleUi('inventory')}>
              <div className={styles.sectionTitle}><Backpack size={12} /> Inventário</div>
              {uiState.inventory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            {uiState.inventory && (
              <div className={styles.sectionBody}>
                {inventory.length === 0 ? (
                  <div className={styles.emptyState}>Vazio</div>
                ) : (
                  inventory.map(item => (
                    <div key={item.id} className={styles.inventoryRow}>
                      <Tooltip text={item.description ?? 'Sem descrição'}>
                        <div
                          className={`${styles.itemCard} ${item.effect_data?.heal ? styles.clickable : ''}`}
                          onClick={() => handleUseItem(item)}
                        >
                          <div className={styles.itemInfo}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className={styles.itemName}>{item.name}</span>
                              <span style={{ color: 'var(--neon-purple)', fontSize: 11, fontWeight: 'bold' }}>x{item.quantity}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <span className={styles.itemSub}>
                                {item.effect_data?.heal
                                  ? `Cura ${item.effect_data.heal} HP`
                                  : item.effect_data?.is_equippable
                                    ? `${item.effect_data.equip_slot ?? 'equipável'}`
                                    : 'Item'}
                              </span>
                              <span style={{ fontSize: 10, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Coins size={10} /> {item.value}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

        {/* Gold footer */}
        <div className={styles.goldFooter}>
          <Coins size={20} color="#fbbf24" />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span className={styles.goldValue}>{character.gold}</span>
            <span className={styles.goldLabel}>Créditos</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
