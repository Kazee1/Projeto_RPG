'use client';

import {
  Home,
  BookOpen,
  Globe,
  Settings,
  ChevronLeft,
  Menu
} from 'lucide-react';
import styles from '@/styles/layout.module.css';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { id: 'nexus', label: 'Nexus', icon: Home, path: '/home' },
    { id: 'files', label: 'Meus Arquivos', icon: BookOpen, path: '/arquivos' },
    { id: 'ether', label: 'O Éter', icon: Globe, path: '/comunidade' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      
      {/* Toggle Button */}
      <div className={styles.toggleBtn} onClick={toggleSidebar}>
        {isOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
      </div>

      {/* Main Navigation */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <a
              key={item.id}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => router.push(item.path)}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={styles.navLabel}>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Settings at Bottom */}
      <div className={styles.sidebarFooter}>
        <a
          className={`${styles.navItem} ${pathname === '/configuracao' ? styles.navItemActive : ''}`}
          onClick={() => router.push('/configuracao')}
        >
          <Settings size={20} strokeWidth={pathname === '/configuracao' ? 2.5 : 2} />
          <span className={styles.navLabel}>Sistema</span>
        </a>
      </div>
    </aside>
  );
}
