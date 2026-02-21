'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseClientregister';
import ReactMarkdown from 'react-markdown';
import {
  MapPin, Hexagon, Coins, Backpack, ChevronDown,
  ChevronUp, Sword, User, TrendingUp, Loader2,
  Lock as LockIcon, Swords, Eye, MessageSquare, Footprints,
  ScrollText, Zap, Sparkles
} from 'lucide-react';
import styles from '@/styles/game.module.css';
import DiceRoller2D from './DiceRoller2D';
import { RealtimeChannel } from '@supabase/supabase-js';

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Sender = 'narrator' | 'player' | 'system';
type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface Message {
  id: string | number;
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
  created_at?: string;
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
  is_attack?: boolean;
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

// Novos tipos para a fase de ataque
type CombatPhase = 'idle' | 'awaiting_attack_choice' | 'rolling_damage';

interface AttackChoice {
  id: string;
  text: string;
  damageDice: DiceType;
  damageAttr: string;
  damageBonus: number;
  flavor: string;
}

interface AttackChoicesRow {
  id: string;
  story_id: string;
  choices: {
    id: string;
    text: string;
    flavor: string;
    damage_dice: string;
    damage_bonus: number;
    damage_attr: string;
  }[];
  target_name: string | null;
  weapon_name: string | null;
  damage_dice: string | null;
  primary_attr: string | null;
  is_used: boolean;
  chosen_id: string | null;
}

// ─── HELPERS DE STAT DISPLAY ──────────────────────────────────────────────────
const renderEquipmentStats = (item: EquipmentItem): React.ReactNode => {
  const s = item.stats ?? {};
  const parts: React.ReactNode[] = [];

  if (s.damage_dice) parts.push(<span key="dmg" style={{ color: '#ef4444' }}>⚔️ {s.damage_dice}</span>);
  if (s.armor && s.armor > 0) parts.push(<span key="armor" style={{ color: '#3b82f6' }}>🛡️ +{s.armor} CA</span>);
  if (s.status_bonus) {
    const bonusVal = s.bonus_value ?? 1;
    parts.push(<span key="bonus" style={{ color: '#a855f7' }}>✦ +{bonusVal} {s.status_bonus}</span>);
  }

  if (parts.length === 0) return <span style={{ color: '#52525b' }}>Equipado</span>;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{parts}</div>;
};

const renderInventoryStats = (item: Item): React.ReactNode => {
  const e = item.effect_data ?? {};

  if (item.type === 'consumable' && e.heal) return <span style={{ color: '#10b981' }}>🧪 Cura {e.heal} HP</span>;
  if (item.type === 'weapon') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {e.damage_dice && <span style={{ color: '#ef4444' }}>⚔️ {e.damage_dice}</span>}
        {e.status_bonus && <span style={{ color: '#a855f7' }}>✦ +1 {e.status_bonus}</span>}
      </div>
    );
  }
  if (item.type === 'armor') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {e.armor && e.armor > 0 && <span style={{ color: '#3b82f6' }}>🛡️ +{e.armor} CA</span>}
        {e.status_bonus && <span style={{ color: '#a855f7' }}>✦ +1 {e.status_bonus}</span>}
      </div>
    );
  }
  return <span style={{ color: '#6b7280' }}>Item</span>;
};

// ─── CÁLCULO DE BÔNUS DO DADO ──────────────────────────────────────────────────
const findStatValue = (skillCheck: string, stats: Record<string, number>): number => {
  if (!skillCheck || !stats) return 0;
  const key = skillCheck.toLowerCase();
  return Object.entries(stats).find(([k]) => {
    const kl = k.toLowerCase();
    return kl === key || kl.startsWith(key.substring(0, 3)) || key.startsWith(kl.substring(0, 3));
  })?.[1] ?? 0;
};

const calcAttrMod = (skillCheck: string, stats: Record<string, number>): number => findStatValue(skillCheck, stats);

const calcEquipBonus = (skillCheck: string, equipment: EquipmentItem[]): number => {
  if (!skillCheck || !equipment.length) return 0;
  const key = skillCheck.toLowerCase();
  return equipment.reduce((acc, eq) => {
    const sb = (eq.stats?.status_bonus ?? '').toLowerCase();
    if (sb === key || sb === key.substring(0, 3) || key.startsWith(sb.substring(0, 3))) {
      return acc + (eq.stats?.bonus_value ?? 1);
    }
    return acc;
  }, 0);
};

const calcClassBonus = (skillCheck: string, className: string): number => {
  const bonuses = getClassBonuses(className);
  if (!bonuses || !skillCheck) return 0;
  const key = skillCheck.toLowerCase();
  const found = Object.entries(bonuses).find(([k]) => {
    const kl = k.toLowerCase();
    return kl === key || kl.startsWith(key.substring(0, 3)) || key.startsWith(kl.substring(0, 3));
  });
  return found?.[1] ?? 0;
};

const calcDiceBonus = (skillCheck: string, stats: Record<string, number>, equipment: EquipmentItem[], className: string, difficulty: string) => {
  const attrVal = calcAttrMod(skillCheck, stats);
  const equipBonus = calcEquipBonus(skillCheck, equipment);
  const classBonus = calcClassBonus(skillCheck, className);
  const divisor = difficulty === 'impossible' ? 4 : 3;
  const statusBonus = Math.floor((attrVal + equipBonus + classBonus) / divisor);
  return { attrVal, equipBonus, classBonus, divisor, statusBonus };
};

const applyDiceFormula = (roll: number, statusBonus: number): number => roll + statusBonus;

const CLASS_STAT_BONUSES: Record<string, Record<string, number>> = {
  'Guerreiro': { forca: 3, constituicao: 2, destreza: 1, intelecto: -1 },
  'Mago': { intelecto: 3, sabedoria: 2, carisma: 1, forca: -1 },
  'Ladino': { destreza: 3, carisma: 2, intelecto: 1, forca: -1 },
  'Clérigo': { sabedoria: 3, constituicao: 2, carisma: 1, destreza: -1 },
  'Paladino': { carisma: 3, forca: 2, constituicao: 1, intelecto: -1 },
  'Bardo': { carisma: 3, destreza: 2, intelecto: 1, forca: -1 },
  'Patrulheiro': { destreza: 3, sabedoria: 2, constituicao: 1, carisma: -1 },
  'Feiticeiro': { carisma: 3, intelecto: 2, sabedoria: 1, forca: -1 },
  'Solo (Mercenário)': { reflexos: 3, corpo: 2, vontade: 1, empatia: -1 },
  'Netrunner (Hacker)': { intelecto: 3, reflexos: 2, tecnica: 1, corpo: -1 },
  'Techie (Engenheiro)': { tecnica: 3, intelecto: 2, vontade: 1, reflexos: -1 },
  'Rockerboy': { empatia: 3, carisma: 2, reflexos: 1, tecnica: -1 },
  'Nomad': { corpo: 3, vontade: 2, reflexos: 1, intelecto: -1 },
  'Medtech': { intelecto: 3, empatia: 2, tecnica: 1, reflexos: -1 },
  'Corpo': { carisma: 3, intelecto: 2, vontade: 1, corpo: -1 },
};

const getClassBonuses = (className: string): Record<string, number> => {
  const exact = CLASS_STAT_BONUSES[className];
  if (exact) return exact;
  const key = Object.keys(CLASS_STAT_BONUSES).find(k => k.toLowerCase().includes(className.toLowerCase()) || className.toLowerCase().includes(k.toLowerCase()));
  return key ? CLASS_STAT_BONUSES[key] : {};
};

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────
const TypewriterMessage = ({ text, speed = 20, onComplete, onTick }: { text: string; speed?: number; onComplete?: () => void; onTick?: () => void; }) => {
  const [charCount, setCharCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setCharCount(0);
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const newCount = Math.min(Math.floor(elapsed / speed) + 1, text.length);

      setCharCount(prev => {
        if (newCount > prev) { onTick?.(); return newCount; }
        return prev;
      });

      if (newCount < text.length) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [text, speed]);

  return (
    <div style={{ whiteSpace: 'pre-line' }}>
      <ReactMarkdown>{text.slice(0, charCount)}</ReactMarkdown>
    </div>
  );
};

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.tooltipContainer} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 6, padding: '4px 8px', fontSize: 10, color, fontWeight: 700, cursor: 'default' }}>
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

  const channelRef = useRef<RealtimeChannel | null>(null);
  const msgIdCounter = useRef(Date.now());
  const isMountedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialItemIdsRef = useRef<Set<string>>(new Set());
  const pendingItemsRef = useRef<Item[]>([]);
  const typingDoneRef = useRef(true);
  const choicesReadyRef = useRef(false);
  const itemsAnimationDoneRef = useRef(true);

  const nextId = () => `sys-${++msgIdCounter.current}`;

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSequencingItems, setIsSequencingItems] = useState(false);
  const [difficulty, setDifficulty] = useState<string>('normal');

  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingNarratorId, setPendingNarratorId] = useState<string | number | null>(null);

  const [choices, setChoices] = useState<Choice[]>([]);
  const [showChoices, setShowChoices] = useState(false);

  const [character, setCharacter] = useState<CharacterStats | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [inventory, setInventory] = useState<Item[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [location, setLocation] = useState('');
  const [quests, setQuests] = useState<string[]>([]);
  const [statusFx, setStatusFx] = useState<StatusEffect[]>([]);
  const [inCombat, setInCombat] = useState(false);

  const [uiState, setUiState] = useState({ stats: false, equipment: false, inventory: false, quests: true });
  const toggleUi = (key: keyof typeof uiState) => setUiState(p => ({ ...p, [key]: !p[key] }));
  const [isTyping, setIsTyping] = useState(false);

  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [currentDiceType, setCurrentDiceType] = useState<DiceType>('d20');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceBonus, setDiceBonus] = useState<number>(0);
  const [diceEquipBonus, setDiceEquipBonus] = useState<number>(0);
  const [diceClassBonus, setDiceClassBonus] = useState<number>(0);
  const [diceDivisor, setDiceDivisor] = useState<number>(3);
  const [diceStatusBonus, setDiceStatusBonus] = useState<number>(0);
  const [currentChoice, setCurrentChoice] = useState<Choice | null>(null);

  // ── ESTADOS DA FASE DE COMBATE (ATTACK CHOICES) ──
  const [combatPhase, setCombatPhase] = useState<CombatPhase>('idle');
  const [attackChoices, setAttackChoices] = useState<AttackChoice[]>([]);
  const [attackChoicesRowId, setAttackChoicesRowId] = useState<string | null>(null);
  const [isLoadingAttackChoices, setIsLoadingAttackChoices] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    if (!scrollRef.current) return;
    const { scrollHeight, clientHeight } = scrollRef.current;
    scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const tryShowChoices = useCallback(() => {
    if (typingDoneRef.current && itemsAnimationDoneRef.current && choicesReadyRef.current) {
      setShowChoices(true);
    }
  }, []);

  const playItemSequence = useCallback(() => {
    if (pendingItemsRef.current.length === 0) {
      setIsSequencingItems(false);
      itemsAnimationDoneRef.current = true;
      tryShowChoices();
      return;
    }

    setIsSequencingItems(true);
    itemsAnimationDoneRef.current = false;

    const processNextItem = () => {
      const nextItem = pendingItemsRef.current.shift();
      if (nextItem) {
        setMessages(prev => [...prev, { id: nextId(), sender: 'system', text: `📦 ${nextItem.name} adicionado` }]);
        setInventory(prev => {
          if (prev.some(i => i.id === nextItem.id)) return prev;
          return [...prev, nextItem];
        });
        scrollToBottom(true);
        setTimeout(() => processNextItem(), 1200);
      } else {
        setIsSequencingItems(false);
        itemsAnimationDoneRef.current = true;
        tryShowChoices();
      }
    };
    processNextItem();
  }, [tryShowChoices, scrollToBottom]);

  // ── HELPERS DE COMBATE ──
  const getWeaponDice = useCallback((): DiceType => {
    const weapon = equipment.find(e => e.slot === 'main_hand');
    const diceStr = weapon?.stats?.damage_dice || weapon?.stats?.damage || '1d4';
    const match = diceStr.match(/d(\d+)/);
    if (match) {
      const sides = parseInt(match[1]);
      const valid: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
      const found = valid.find(d => d === `d${sides}`);
      return found || 'd6';
    }
    return 'd6';
  }, [equipment]);

  const getWeaponDiceCount = useCallback((): number => {
    const weapon = equipment.find(e => e.slot === 'main_hand');
    const diceStr = weapon?.stats?.damage_dice || weapon?.stats?.damage || '1d4';
    const match = diceStr.match(/^(\d+)d/);
    return match ? parseInt(match[1]) : 1;
  }, [equipment]);

  const mapRowToAttackChoices = useCallback((row: AttackChoicesRow): AttackChoice[] => {
    const weapon = equipment.find(e => e.slot === 'main_hand');
    const primaryAttr = row.primary_attr || weapon?.stats?.status_bonus || 'FOR';
    return (row.choices || []).map(c => {
      const sideMatch = c.damage_dice.match(/d(\d+)/);
      const sides = sideMatch ? parseInt(sideMatch[1]) : 6;
      return {
        id: c.id,
        text: c.text,
        flavor: c.flavor,
        damageDice: `d${sides}` as DiceType,
        damageAttr: c.damage_attr || primaryAttr,
        damageBonus: c.damage_bonus ?? 0,
      };
    });
  }, [equipment]);

  const fetchAttackChoicesWithRetry = useCallback(async (storyId: string, attempt = 0) => {
    if (!isMountedRef.current || attempt >= 10) {
      setIsLoadingAttackChoices(false);
      // Fallback seguro caso o n8n demore muito
      const dt = getWeaponDice();
      setAttackChoices([
        { id: 'atk_1', text: 'Ataque Rápido', flavor: 'Direto', damageDice: dt, damageAttr: 'FOR', damageBonus: 0 },
        { id: 'atk_2', text: 'Golpe Pesado', flavor: 'Poderoso', damageDice: dt, damageAttr: 'FOR', damageBonus: 2 },
        { id: 'atk_3', text: 'Ataque Preciso', flavor: 'Estratégico', damageDice: dt, damageAttr: 'FOR', damageBonus: -1 },
      ]);
      setCombatPhase('awaiting_attack_choice');
      return;
    }

    const { data } = await supabase
      .from('attack_choices')
      .select('*')
      .eq('story_id', storyId)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as AttackChoicesRow;
      setAttackChoicesRowId(row.id);
      setAttackChoices(mapRowToAttackChoices(row));
      setIsLoadingAttackChoices(false);
      setCombatPhase('awaiting_attack_choice');
      setTimeout(() => scrollToBottom(true), 200);
    } else {
      setTimeout(() => fetchAttackChoicesWithRetry(storyId, attempt + 1), 1500);
    }
  }, [getWeaponDice, mapRowToAttackChoices, scrollToBottom]);

  const fetchChoicesWithRetry = useCallback(async (storyId: string, attempt = 0) => {
    if (!isMountedRef.current || attempt >= 8) return;
    const { data } = await supabase.from('choices').select('*').eq('story_id', storyId).eq('is_chosen', false);
    if (data && data.length > 0) {
      choicesReadyRef.current = true;
      setChoices(data.map((c: any) => ({
        id: c.id, text: c.text, type: c.type,
        skillCheck: c.skill_check, difficulty: c.difficulty, diceType: c.dice_type, is_attack: c.is_attack
      })));
      tryShowChoices();
    } else {
      setTimeout(() => fetchChoicesWithRetry(storyId, attempt + 1), 1500);
    }
  }, [tryShowChoices]);

  const checkAndTriggerResume = useCallback(async (storyId: string) => {
    const { count } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .eq('story_id', storyId).in('sender', ['player', 'narrator']);
    if (!count) return;
    if (count % 10 === 0) {
      fetch('/api/game/resume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ story_id: storyId }),
      }).catch(err => console.error('Erro ao chamar resume:', err));
    }
  }, []);

  // ── 1. LOAD INICIAL ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;
    isMountedRef.current = true;
    const storyId = Array.isArray(params.id) ? params.id[0] : params.id;

    const loadGameData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: story, error: storyError } = await supabase.from('stories').select('*').eq('id', storyId).single();
        if (storyError || !story) throw storyError;
        if (story.user_id !== user.id) { setAccessDenied(true); setLoading(false); return; }

        setDifficulty(story.difficulty ?? 'normal');
        setInCombat(story.in_combat ?? false);

        const { data: equipData } = await supabase.from('equipment').select('*').eq('story_id', storyId);
        setEquipment(equipData ?? []);

        setCharacter({
          name: story.character_name, class: story.class_name,
          level: story.level ?? 1, hp: story.hp_current ?? 10,
          maxHp: story.hp_max ?? 10, ac: story.armor_class ?? 10,
          gold: story.gold ?? 0, xp: story.experience ?? 0,
        });
        setStats(story.attributes ?? {});
        setLocation(story.current_location ?? '');
        setQuests(Array.isArray(story.active_quests) ? story.active_quests : []);
        setStatusFx(Array.isArray(story.status_effects) ? story.status_effects : []);

        const { data: itemsData } = await supabase.from('items').select('*').eq('story_id', storyId);
        setInventory(itemsData ?? []);
        initialItemIdsRef.current = new Set((itemsData ?? []).map((i: any) => i.id));

        const { data: msgData } = await supabase
          .from('messages').select('*').eq('story_id', storyId).order('created_at', { ascending: true });

        if (msgData && msgData.length > 0) {
          const formatted: Message[] = msgData.map((m: any) => ({
            id: m.id, sender: m.sender as Sender, text: m.content, roll: m.roll_result,
          }));
          setMessages(formatted);

          if (formatted[formatted.length - 1].sender === 'narrator') {
            typingDoneRef.current = true;
            itemsAnimationDoneRef.current = true;
            const { data: choicesData } = await supabase
              .from('choices').select('*').eq('story_id', storyId).eq('is_chosen', false);
            if (choicesData && choicesData.length > 0) {
              choicesReadyRef.current = true;
              setChoices(choicesData.map((c: any) => ({
                id: c.id, text: c.text, type: c.type,
                skillCheck: c.skill_check, difficulty: c.difficulty, diceType: c.dice_type, is_attack: c.is_attack
              })));
              setShowChoices(true);
            }
          }
        }
      } catch (err) {
        console.error('Initial load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
    return () => { isMountedRef.current = false; };
  }, [params.id, router]);

  // ── 2. POLLING ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || messages.length > 0 || !params.id) return;
    const storyId = Array.isArray(params.id) ? params.id[0] : params.id;

    const intervalId = setInterval(async () => {
      if (!isMountedRef.current) { clearInterval(intervalId); return; }
      const { data } = await supabase
        .from('messages').select('*').eq('story_id', storyId).order('created_at', { ascending: true });

      if (data && data.length > 0) {
        clearInterval(intervalId);
        const formatted: Message[] = data.map((m: any) => ({
          id: m.id, sender: m.sender as Sender, text: m.content, roll: m.roll_result,
        }));
        setMessages(formatted);

        const lastMsg = data[data.length - 1];
        if (lastMsg.sender === 'narrator') {
          typingDoneRef.current = false;
          itemsAnimationDoneRef.current = false;
          choicesReadyRef.current = false;
          setIsTyping(true);
          setPendingNarratorId(lastMsg.id);
          fetchChoicesWithRetry(storyId);
        }
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [loading, messages.length, params.id, fetchChoicesWithRetry]);

  // ── 3. REALTIME ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;
    const storyId = Array.isArray(params.id) ? params.id[0] : params.id;
    let alive = true;

    const connectRealtime = () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      if (!alive) return;

      const channel = supabase
        .channel(`game-${storyId}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `story_id=eq.${storyId}` }, (payload) => {
          if (!alive) return;
          const m = payload.new as any;
          setMessages(prev => {
            if (prev.some(msg => msg.id === m.id)) return prev;
            return [...prev, { id: m.id, sender: m.sender as Sender, text: m.content, roll: m.roll_result }];
          });
          if (m.sender === 'narrator') {
            setIsProcessing(false); setIsTyping(true);
            typingDoneRef.current = false; itemsAnimationDoneRef.current = false;
            choicesReadyRef.current = false; setShowChoices(false);
            setPendingNarratorId(m.id);
            setTimeout(() => fetchChoicesWithRetry(storyId), 1000);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories', filter: `id=eq.${storyId}` }, async (payload) => {
          if (!alive) return;
          const s = payload.new as any;
          setInCombat(s.in_combat ?? false);
          setCharacter(prev => prev ? ({
            ...prev,
            hp: s.hp_current ?? prev.hp, maxHp: s.hp_max ?? prev.maxHp,
            ac: s.armor_class ?? prev.ac, gold: s.gold ?? prev.gold,
            xp: s.experience ?? prev.xp, level: s.level ?? prev.level,
          }) : null);
          if (s.current_location) setLocation(s.current_location);
          if (Array.isArray(s.status_effects)) setStatusFx(s.status_effects);
          const { data: freshStory } = await supabase.from('stories').select('active_quests').eq('id', storyId).single();
          if (freshStory && Array.isArray(freshStory.active_quests)) setQuests(freshStory.active_quests);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items', filter: `story_id=eq.${storyId}` }, (payload) => {
          if (!alive) return;
          const item = payload.new as Item;
          if (initialItemIdsRef.current.has(item.id)) return;
          pendingItemsRef.current.push(item);
          if (typingDoneRef.current) playItemSequence();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items', filter: `story_id=eq.${storyId}` }, async (payload) => {
          if (!alive) return;
          const old = payload.old as any;
          if (old?.id) {
            setInventory(prev => prev.filter(i => i.id !== old.id));
          } else {
            const { data } = await supabase.from('items').select('*').eq('story_id', storyId);
            setInventory(data ?? []);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment', filter: `story_id=eq.${storyId}` }, async () => {
          if (!alive) return;
          const { data } = await supabase.from('equipment').select('*').eq('story_id', storyId);
          setEquipment(data ?? []);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attack_choices', filter: `story_id=eq.${storyId}` }, (payload) => {
          if (!alive) return;
          const row = payload.new as AttackChoicesRow;
          if (!row.is_used) {
            setAttackChoicesRowId(row.id);
            setAttackChoices(mapRowToAttackChoices(row));
            setIsLoadingAttackChoices(false);
            setCombatPhase('awaiting_attack_choice');
            setTimeout(() => scrollToBottom(true), 200);
          }
        })
        .subscribe((status) => {
          if ((status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') && alive) {
            setTimeout(() => { if (alive) connectRealtime(); }, 3000);
          }
        });

      channelRef.current = channel;
    };

    connectRealtime();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && alive) {
        const status = (channelRef.current as any)?.state;
        if (!channelRef.current || status === 'closed' || status === 'errored') connectRealtime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [params.id, fetchChoicesWithRetry, playItemSequence, mapRowToAttackChoices, scrollToBottom]);

  useEffect(() => {
    if (!loading && messages.length > 0) setTimeout(() => scrollToBottom(false), 100);
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (showChoices) {
      setTimeout(() => scrollToBottom(true), 100);
      setTimeout(() => scrollToBottom(true), 450);
    }
  }, [showChoices, scrollToBottom]);

  // ── AÇÕES ─────────────────────────────────────────────────────────────────
  const handleUseItem = async (item: Item) => {
    if (!character || !item.effect_data?.heal) return;
    const heal = item.effect_data.heal as number;
    const newHp = Math.min(character.hp + heal, character.maxHp);
    setCharacter(p => p ? { ...p, hp: newHp } : null);
    await supabase.from('stories').update({ hp_current: newHp }).eq('id', params.id);
    if (item.quantity > 1) {
      await supabase.from('items').update({ quantity: item.quantity - 1 }).eq('id', item.id);
    } else {
      await supabase.from('items').delete().eq('id', item.id);
    }
    setMessages(p => [...p, { id: nextId(), sender: 'system', text: `🧪 Recuperou ${heal} HP com ${item.name}.` }]);
  };

  // ── ESCOLHA NORMAL DO TURNO ───────────────────────────────────────────────
  const handleChoice = async (choice: Choice) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setChoices([]);
    setShowChoices(false);

    typingDoneRef.current = false;
    itemsAnimationDoneRef.current = false;
    choicesReadyRef.current = false;
    pendingItemsRef.current = [];

    let rollValue: number | null = null;
    let isSuccess = false;

    if (choice.skillCheck && choice.diceType) {
      const max = parseInt(choice.diceType.substring(1));
      const rawRoll = Math.floor(Math.random() * max) + 1;

      const { attrVal, equipBonus, classBonus, divisor, statusBonus } =
        calcDiceBonus(choice.skillCheck, stats, equipment, character?.class ?? '', difficulty);
      rollValue = applyDiceFormula(rawRoll, statusBonus);
      isSuccess = rollValue >= (choice.difficulty ?? 0);

      setCurrentChoice(choice);
      setCurrentDiceType(choice.diceType);
      setDiceBonus(attrVal);
      setDiceEquipBonus(equipBonus);
      setDiceClassBonus(classBonus);
      setDiceDivisor(divisor);
      setDiceStatusBonus(statusBonus);
      setDiceResult(null);
      setIsRolling(true);
      setShowDiceOverlay(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDiceResult(rawRoll);
      setIsRolling(false);
    }

    const { data: insertedMsg, error: insertError } = await supabase
      .from('messages')
      .insert({ story_id: params.id, sender: 'player', content: choice.text, roll_result: rollValue })
      .select().single();

    if (!insertError && insertedMsg) {
      setMessages(p => {
        if (p.some(m => m.id === insertedMsg.id)) return p;
        return [...p, { id: insertedMsg.id, sender: 'player' as Sender, text: choice.text, roll: rollValue ?? undefined }];
      });
    }

    if (rollValue !== null) {
      const { attrVal, equipBonus, classBonus, divisor, statusBonus } =
        calcDiceBonus(choice.skillCheck!, stats, equipment, character?.class ?? '', difficulty);
      const rawRoll = rollValue - statusBonus;
      const bonusParts: string[] = [];
      if (attrVal) bonusParts.push(`${attrVal}📊`);
      if (equipBonus > 0) bonusParts.push(`+${equipBonus}🗡️`);
      if (classBonus !== 0) bonusParts.push(`${classBonus >= 0 ? '+' : ''}${classBonus}⚜️`);
      const breakdownStr = bonusParts.length
        ? ` (${bonusParts.join(' ')} ÷${divisor}=${statusBonus >= 0 ? '+' : ''}${statusBonus})`
        : '';
      setMessages(p => [...p, {
        id: nextId(), sender: 'system',
        text: `🎲 ${rawRoll}${breakdownStr} = ${rollValue} vs DC ${choice.difficulty ?? '?'} — ${isSuccess ? '✅ Sucesso' : '❌ Falha'}`,
      }]);
    }

    // ── GATILHO PARA OPÇÕES DE ATAQUE (SE ACERTOU) ──
    const isCombatHit = rollValue !== null && isSuccess && (choice.is_attack || (inCombat && choice.type === 'action'));

    if (isCombatHit) {
      const storyId = Array.isArray(params.id) ? params.id[0] : params.id as string;
      setIsLoadingAttackChoices(true);
      setIsProcessing(false); // Libera processamento principal pois agora aguardamos o sub-estado

      // Chama a rota de geração do n8n para ataques e inicia o polling
      fetch('/api/game/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId }),
      }).catch(err => console.error('attack trigger error:', err));

      fetchAttackChoicesWithRetry(storyId);
      return;
    }

    // ── FLUXO NORMAL DE NARRATIVA ──
    await supabase.from('choices').update({ is_chosen: true }).eq('story_id', params.id);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    fetch('/api/game/continue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: abortControllerRef.current.signal, keepalive: true,
      body: JSON.stringify({ story_id: params.id }),
    }).catch(err => {
      if (err?.name === 'AbortError') return;
      console.error('Erro ao chamar continue:', err);
      setIsProcessing(false);
    });

    await checkAndTriggerResume(Array.isArray(params.id) ? params.id[0] : params.id as string);
  };

  // ── ESCOLHA DE OPÇÃO DE ATAQUE ────────────────────────────────────────────
  const handleAttackChoice = async (atk: AttackChoice) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setAttackChoices([]);
    setCombatPhase('rolling_damage');

    // Lógica do dado de dano
    const attrRawVal = calcAttrMod(atk.damageAttr, stats);
    const attrDmgVal = Math.floor(attrRawVal / 4);
    const diceCount = getWeaponDiceCount();
    const diceSides = parseInt(atk.damageDice.substring(1));

    let diceOnlyTotal = 0;
    for (let i = 0; i < diceCount; i++) {
      diceOnlyTotal += Math.floor(Math.random() * diceSides) + 1;
    }
    const totalDamage = Math.max(1, diceOnlyTotal + atk.damageBonus + attrDmgVal);

    // Overlay visual do dado de dano
    setCurrentDiceType(atk.damageDice);
    setDiceBonus(attrDmgVal);
    setDiceEquipBonus(0);
    setDiceClassBonus(atk.damageBonus);
    setDiceDivisor(1);
    setDiceStatusBonus(attrDmgVal + atk.damageBonus);
    setDiceResult(null);
    setIsRolling(true);
    setShowDiceOverlay(true);

    await new Promise(resolve => setTimeout(resolve, 1400));
    setDiceResult(diceOnlyTotal);
    setIsRolling(false);

    // Mensagem do Sistema
    const diceCountStr = diceCount > 1 ? `${diceCount}${atk.damageDice}` : atk.damageDice;
    const bonusParts: string[] = [];
    if (atk.damageBonus !== 0) bonusParts.push(`${atk.damageBonus > 0 ? '+' : ''}${atk.damageBonus}`);
    if (attrDmgVal !== 0) bonusParts.push(`+${attrDmgVal}${atk.damageAttr}(/4)`);
    const breakdownStr = bonusParts.length ? ` ${bonusParts.join(' ')}` : '';
    setMessages(p => [...p, {
      id: nextId(), sender: 'system',
      text: `⚔️ Dano: ${diceCountStr}${breakdownStr} = **${totalDamage}**`,
    }]);

    if (attackChoicesRowId) {
      await supabase.from('attack_choices').update({ is_used: true, chosen_id: atk.id }).eq('id', attackChoicesRowId);
    }

    // Insere o dano rolado na mensagem do player para o LLM narrar o impacto
    await supabase.from('messages').insert({
      story_id: params.id,
      sender: 'player',
      content: `${atk.text} [DANO:${totalDamage}]`,
      roll_result: totalDamage,
    });

    setCombatPhase('idle');
    setAttackChoicesRowId(null);

    await supabase.from('choices').update({ is_chosen: true }).eq('story_id', params.id);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    // Enfim, chama a continuação para o Narrador processar a morte ou revide
    fetch('/api/game/continue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: abortControllerRef.current.signal, keepalive: true,
      body: JSON.stringify({ story_id: params.id }),
    }).catch(err => {
      if (err?.name === 'AbortError') return;
      console.error('Erro ao chamar continue:', err);
      setIsProcessing(false);
    });

    await checkAndTriggerResume(Array.isArray(params.id) ? params.id[0] : params.id as string);
  };

  const handleAnimationComplete = () => {
    if (diceResult === null || !currentChoice) return;
    setShowDiceOverlay(false);
  };

  const handleTypingComplete = useCallback((msgId: string | number) => {
    setPendingNarratorId(prev => (prev === msgId ? null : prev));
    setIsTyping(false);
    typingDoneRef.current = true;
    playItemSequence();
  }, [playItemSequence]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (accessDenied) return (
    <div className={styles.centered}><LockIcon size={64} /><h1>Acesso Negado</h1></div>
  );
  if (loading || !character) return (
    <div className={styles.centered}><Loader2 className="spin" size={48} /></div>
  );

  // ▼ NOVA TELA DE GAME OVER AQUI ▼
  if (character.hp <= 0) {
    return (
      <div className={styles.centered} style={{
        flexDirection: 'column', gap: 24,
        background: 'radial-gradient(ellipse at center, #2a0000 0%, #000 70%)',
        minHeight: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 9999
      }}>
        <div style={{
          fontSize: 100, animation: 'pulse 2s infinite',
          filter: 'drop-shadow(0 0 30px #ef4444)', marginBottom: -20
        }}>💀</div>
        <h1 style={{
          fontSize: 56, fontWeight: 900, color: '#ef4444', letterSpacing: 6,
          textShadow: '0 0 40px #ef444488, 0 0 80px #ef444444',
          fontFamily: 'monospace', textTransform: 'uppercase', textAlign: 'center'
        }}>GAME OVER</h1>
        <p style={{ color: '#9ca3af', fontSize: 18, letterSpacing: 2, textAlign: 'center' }}>
          {character.name} caiu em batalha. O mundo foi consumido pelas sombras.
        </p>
        <button
          onClick={() => router.push('/home')}
          style={{
            marginTop: 20, padding: '16px 48px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
            color: '#ef4444', borderRadius: 12, fontSize: 16,
            fontWeight: 700, letterSpacing: 3, cursor: 'pointer',
            textTransform: 'uppercase', transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
        >
          Voltar para o Início
        </button>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }`}</style>
      </div>
    );
  }
  // ▲ FIM DA TELA DE GAME OVER ▲

  if (messages.length === 0) {
    return (
      <div className={styles.centered} style={{ flexDirection: 'column', gap: 20 }}>
        <Sparkles className="spin" size={64} color="var(--neon-purple)" />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Renderizando Universo...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>O Narrador está escrevendo o primeiro capítulo.</p>
        </div>
      </div>
    );
  }

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
          attrVal={diceBonus}
          equipBonus={diceEquipBonus}
          classBonus={diceClassBonus}
          divisor={diceDivisor}
          statusBonus={diceStatusBonus}
          skillCheck={currentChoice?.skillCheck}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* ── ÁREA CENTRAL ──────────────────────────────────────────────── */}
      <div className={styles.mainArea}>
        <div className={styles.sceneHeader}>
          <div className={styles.locationTitle}>
            <MapPin size={16} /> <span>{location || character.name}</span>
          </div>
          {isProcessing && (
            <div className={styles.processingBadge}>
              <Loader2 size={12} className="spin" /> <span>Narrando…</span>
            </div>
          )}
        </div>

        <div className={`${styles.contentSplit} ${(showChoices || combatPhase === 'awaiting_attack_choice') ? styles.splitMode : styles.fullMode}`}>
          <div className={styles.logContainer} ref={scrollRef}>
            {messages.map((msg) => {
              const shouldType = msg.id === pendingNarratorId && msg.sender === 'narrator';
              return (
                <div key={msg.id} className={
                  msg.sender === 'narrator' ? styles.msgNarrator
                    : msg.sender === 'player' ? styles.msgPlayer
                      : styles.msgSystem
                }>
                  {msg.sender === 'system' && <Hexagon size={14} className="mr-2" />}
                  {msg.sender === 'narrator' && <div className={styles.senderName}>Mestre</div>}
                  {shouldType ? (
                    <TypewriterMessage text={msg.text} speed={20}
                      onTick={() => scrollToBottom(true)}
                      onComplete={() => handleTypingComplete(msg.id)} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-line' }}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              );
            })}

            {isProcessing && !isTyping && !isSequencingItems && (
              <div className={styles.msgSystem}>
                <Loader2 size={12} className="spin" style={{ marginRight: 6 }} />
                O Mestre está criando a cena...
              </div>
            )}
            {isSequencingItems && (
              <div className={styles.msgSystem} style={{ opacity: 0.7 }}>
                <Sparkles size={12} className="spin" style={{ marginRight: 6 }} />
                Recebendo recompensas...
              </div>
            )}
            {isLoadingAttackChoices && (
              <div className={styles.msgSystem} style={{ opacity: 0.8, color: '#ef4444' }}>
                <Loader2 size={12} className="spin" style={{ marginRight: 6 }} />
                Gerando opções de ataque...
              </div>
            )}
          </div>

          {/* ── FASE DE COMBATE: ESCOLHA DO GOLPE ───────────────────────── */}
          {combatPhase === 'awaiting_attack_choice' && !isProcessing && (
            <div className={styles.optionsArea}>
              <div className={styles.choicesScrollContainer}>
                <div style={{
                  padding: '8px 12px', marginBottom: 8,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, color: '#ef4444', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center',
                }}>
                  ⚔️ Acertou! Como vai atacar?
                </div>
                {attackChoices.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, padding: '16px 0' }}>
                    <span style={{ marginRight: 6 }}>⚔️</span>Gerando opções de ataque...
                  </div>
                )}
                {attackChoices.map(atk => (
                  <button key={atk.id} className={styles.optionBtn}
                    onClick={() => handleAttackChoice(atk)}
                    disabled={showDiceOverlay}
                    data-type="action">
                    <div className={styles.optionIcon}>⚔️</div>
                    <div className={styles.optionContent}>
                      <span className={styles.optionText}>{atk.text}</span>
                      <span className={styles.optionMeta}>{atk.flavor}</span>
                    </div>
                    <div className={styles.rollBadge} style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' }}>
                      <span style={{ color: '#ef4444', fontWeight: 800 }}>{atk.damageDice}</span>
                      <span style={{ color: '#f97316' }}>+{atk.damageAttr}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FASE NORMAL: ESCOLHA DA AÇÃO ────────────────────────────── */}
          {showChoices && !isProcessing && combatPhase === 'idle' && (
            <div className={styles.optionsArea}>
              <div className={styles.choicesScrollContainer}>
                {choices.map(choice => {
                  const Icon = choice.type === 'investigate' ? Eye
                    : choice.type === 'social' ? MessageSquare
                      : choice.type === 'stealth' ? Footprints : Swords;

                  const previewAttr = choice.skillCheck ? calcAttrMod(choice.skillCheck, stats) : 0;
                  const previewEquip = choice.skillCheck ? calcEquipBonus(choice.skillCheck, equipment) : 0;
                  const previewClass = choice.skillCheck ? calcClassBonus(choice.skillCheck, character?.class ?? '') : 0;
                  const previewDiv = difficulty === 'impossible' ? 4 : 3;
                  const previewBonus = Math.floor((previewAttr + previewEquip + previewClass) / previewDiv);

                  return (
                    <button key={choice.id} className={styles.optionBtn}
                      onClick={() => handleChoice(choice)}
                      disabled={showDiceOverlay || isProcessing}
                      data-type={choice.type}>
                      <div className={styles.optionIcon}><Icon size={18} /></div>
                      <div className={styles.optionContent}>
                        <span className={styles.optionText}>{choice.text}</span>
                        <span className={styles.optionMeta}>
                          {choice.type.toUpperCase()}
                          {choice.skillCheck && ` • ${choice.skillCheck.toUpperCase()}`}
                        </span>
                        {choice.skillCheck && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            {previewAttr !== 0 && (
                              <span style={{ fontSize: 9, color: '#22d3ee', fontWeight: 700 }}>
                                {previewAttr}📊
                              </span>
                            )}
                            {previewEquip > 0 && (
                              <span style={{ fontSize: 9, color: '#a855f7', fontWeight: 700 }}>
                                +{previewEquip}🗡️
                              </span>
                            )}
                            {previewClass !== 0 && (
                              <span style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>
                                {previewClass >= 0 ? '+' : ''}{previewClass}⚜️
                              </span>
                            )}
                            <span style={{ fontSize: 9, color: '#4b5563' }}>÷{previewDiv}</span>
                            <span style={{ fontSize: 9, color: '#6b7280' }}>=</span>
                            <span style={{ fontSize: 10, color: previewBonus >= 0 ? '#4ade80' : '#ef4444', fontWeight: 800 }}>
                              {previewBonus >= 0 ? '+' : ''}{previewBonus}
                            </span>
                          </div>
                        )}
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
          <div className={styles.characterHeader}>
            <div className={styles.avatarPlaceholder}><User size={24} /></div>
            <div className={styles.characterInfo}>
              <div className={styles.characterName}>{character.name}</div>
              <div className={styles.characterClass}>{character.class} • Nv.{character.level}</div>
            </div>
          </div>

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

          <div className={styles.xpContainer}>
            <div className={styles.xpBarBg}><div className={styles.xpBarFill} style={{ width: `${xpPct}%` }} /></div>
            <div className={styles.xpText}>{character.xp} / {xpToNext} XP</div>
          </div>

          {statusFx.length > 0 && (
            <div className={styles.statusEffectsRow}>
              {statusFx.map(ef => <StatusBadge key={ef.id} effect={ef} />)}
            </div>
          )}

          {/* Missões */}
          <div className={styles.hudSection}>
            <div className={styles.sectionHeader} onClick={() => toggleUi('quests')}>
              <div className={styles.sectionTitle}><ScrollText size={12} /> Missões</div>
              {uiState.quests ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            {uiState.quests && (
              <div className={styles.sectionBody}>
                {location && (
                  <div className={styles.locationRow}>
                    <MapPin size={11} style={{ color: '#22d3ee' }} /> <span>{location}</span>
                  </div>
                )}
                {quests.map((q, i) => (
                  <div key={i} className={styles.questRow}>
                    <span className={styles.questBullet}>◆</span><span>{q}</span>
                  </div>
                ))}
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
                    const eqBonus = equipment.reduce((acc, eq) => {
                      const s = eq.stats ?? {};
                      const sb = (s.status_bonus ?? '').toLowerCase();
                      const kl = k.toLowerCase();
                      if (sb === kl || sb === kl.substring(0, 3) || kl.startsWith(sb.substring(0, 3))) {
                        return acc + (s.bonus_value ?? 1);
                      }
                      return acc;
                    }, 0);

                    const clsBonus = character ? calcClassBonus(k, character.class) : 0;

                    return (
                      <div key={k} className={styles.statItem}>
                        <span className={styles.statName}>{k.substring(0, 3).toUpperCase()}</span>
                        <div className={styles.statValueContainer}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span className={styles.statValue}>{v as number}</span>
                            {eqBonus > 0 && (
                              <span style={{ fontSize: 9, color: '#a855f7', fontWeight: 700 }}>
                                +{eqBonus}
                              </span>
                            )}
                            {clsBonus !== 0 && (
                              <span style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>
                                {clsBonus >= 0 ? '+' : ''}{clsBonus}
                              </span>
                            )}
                          </div>
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
                {equipment.map(item => (
                  <div key={item.id} className={styles.equipmentRow}>
                    <Tooltip text={item.description ?? 'Equipado'}>
                      <div className={styles.itemCard}>
                        <div className={styles.itemIcon}>{item.icon ?? '🛡️'}</div>
                        <div className={styles.itemInfo}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className={styles.itemName}>{item.name}</span>
                            <span style={{ color: 'var(--neon-cyan)', fontSize: 9, textTransform: 'uppercase' }}>{item.slot}</span>
                          </div>
                          <div className={styles.itemSub}>
                            {renderEquipmentStats(item)}
                          </div>
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                ))}
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
                {inventory.map(item => (
                  <div key={item.id} className={styles.inventoryRow}>
                    <Tooltip text={item.description ?? ''}>
                      <div
                        className={`${styles.itemCard} ${item.effect_data?.heal ? styles.clickable : ''}`}
                        onClick={() => handleUseItem(item)}
                      >
                        <div className={styles.itemInfo}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className={styles.itemName}>{item.name}</span>
                            <span style={{ color: 'var(--neon-purple)', fontSize: 11 }}>x{item.quantity}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <div className={styles.itemSub}>
                              {renderInventoryStats(item)}
                            </div>
                            <span style={{ fontSize: 10, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Coins size={10} /> {item.value}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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