'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Bell, LogOut, CheckCheck, Trash2, 
  Zap, Heart, ShieldAlert, Info, 
  User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/supabaseClientregister'; // Seu client
import styles from '@/styles/layout.module.css';
import profileStyles from '@/styles/profile.module.css';
import notifStyles from '@/styles/notifications.module.css';

// --- TIPOS DE NOTIFICAÇÃO ---
type NotifType = 'system' | 'game' | 'social' | 'alert';

interface Notification {
  id: number;
  type: NotifType;
  text: string;
  time: string;
  read: boolean;
}

// --- DADOS MOCKADOS ---
const initialNotifs: Notification[] = [
  { id: 1, type: 'game', text: "Você ganhou 500 XP na crônica 'Protocolo Zero'.", time: "2 min atrás", read: false },
  { id: 2, type: 'social', text: "LadyVengeance curtiu sua história 'O Dragão'.", time: "1h atrás", read: false },
  { id: 3, type: 'system', text: "Manutenção programada do Nexus em 24h.", time: "3h atrás", read: true },
  { id: 4, type: 'alert', text: "Sua assinatura Pro expira em 3 dias.", time: "1 dia atrás", read: true },
];

interface HeaderProps {
  sidebarOpen: boolean;
}

export default function Header({ sidebarOpen }: HeaderProps) {
  const router = useRouter();
  
  // Estados dos Menus
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  // Estado das Notificações
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifs);
  
  // NOVO: Estado para a cor do Avatar
  const [avatarColor, setAvatarColor] = useState('#333'); // Começa padrão

  // Refs para clique fora
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // --- 1. BUSCAR COR DO AVATAR NO BANCO ---
  useEffect(() => {
    const fetchAvatarColor = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_color')
            .eq('id', user.id)
            .single();

          if (data?.avatar_color) {
            setAvatarColor(data.avatar_color);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar avatar no header", error);
      }
    };

    fetchAvatarColor();
  }, []);

  // --- FUNÇÃO DE LOGOUT ---
  const handleLogout = async () => {
    try {
      // Tenta deslogar no Supabase
      await supabase.auth.signOut();
      
      // Força o redirecionamento e limpa o cache do cliente
      router.push('/login');
      router.refresh(); 
    } catch (error) {
      console.error('Erro ao deslogar:', error);
      // Fallback de segurança: força o navegador a ir para login
      window.location.href = '/login';
    }
  };

  // Fecha menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helpers de Notificação
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Helper para ícone
  const getNotifIcon = (type: NotifType) => {
    switch(type) {
      case 'game': return <Zap size={18} />;
      case 'social': return <Heart size={18} />;
      case 'alert': return <ShieldAlert size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getIconStyle = (type: NotifType) => {
    switch(type) {
      case 'game': return notifStyles.typeGame;
      case 'social': return notifStyles.typeSocial;
      case 'alert': return notifStyles.typeAlert;
      default: return notifStyles.typeSystem;
    }
  };

  return (
    <header 
      className={styles.header}
      // ESTILO INLINE PARA GARANTIR O SCROLL (Sobrescreve o CSS se necessário)
      style={{ 
        position: 'relative', 
        width: '100%',
        left: 'auto',
        right: 'auto'
      }}
    >
      {/* O Logo só aparece aqui se a Sidebar estiver fechada (para não duplicar) */}
      <div className={`${styles.headerLogo} ${!sidebarOpen ? styles.headerLogoVisible : ''}`}>
        MindRender_
      </div>

      <div className={styles.userArea}>
        
        {/* --- 1. NOTIFICAÇÕES --- */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <div 
            className={styles.notificationIcon} 
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            style={{ color: showNotifMenu ? '#fff' : 'var(--text-secondary)' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <div className={styles.badge}></div>}
          </div>

          {/* DROPDOWN DE NOTIFICAÇÕES */}
          {showNotifMenu && (
            <div className={notifStyles.dropdown}>
              
              <div className={notifStyles.header}>
                <span className={notifStyles.title}>Notificações ({unreadCount})</span>
                <div className={notifStyles.actions}>
                  <button className={notifStyles.actionLink} onClick={markAllRead}>
                    <CheckCheck size={14} style={{ display:'inline', marginRight:4 }} /> 
                    Ler todas
                  </button>
                  <button className={`${notifStyles.actionLink} ${notifStyles.clearLink}`} onClick={clearAll}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className={notifStyles.list}>
                {notifications.length === 0 ? (
                  <div className={notifStyles.emptyState}>
                    <Bell size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <p>Tudo silencioso no Nexus.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`${notifStyles.item} ${!notif.read ? notifStyles.unread : ''}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className={`${notifStyles.iconWrapper} ${getIconStyle(notif.type)}`}>
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className={notifStyles.content}>
                        <p className={notifStyles.message}>{notif.text}</p>
                        <span className={notifStyles.time}>{notif.time}</span>
                      </div>
                      {!notif.read && <div className={notifStyles.unreadDot} />}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

        {/* --- 2. PERFIL --- */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            className={styles.avatarContainer} 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
             {/* AQUI ESTÁ A MUDANÇA: Usa avatarColor */}
             <div 
               className={styles.avatarImg} 
               style={{ 
                 background: avatarColor, 
                 transition: 'background 0.3s ease' 
               }} 
             /> 
          </div>

          {showProfileMenu && (
            <div className={profileStyles.dropdownMenu}>
              <Link href="/profile" className={profileStyles.menuItem} onClick={() => setShowProfileMenu(false)}>
                <User size={16} /> <span>Meu Perfil</span>
              </Link>
              
              <div className={profileStyles.menuDivider}></div>
              
              <button 
                onClick={handleLogout} 
                className={`${profileStyles.menuItem} ${profileStyles.danger}`}
              >
                <LogOut size={16} /> <span>Desconectar</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}