'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar'; 
import Header from './Header'; 

export default function MindRenderLayout({ children }: { children: React.ReactNode }) {
  // ✅ Estado sempre começa com o mesmo valor no servidor e cliente
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // ✅ Sincroniza com localStorage APÓS a hidratação
  useEffect(() => {
    const saved = localStorage.getItem('mindrender_sidebar_open');
    if (saved !== null) {
      setSidebarOpen(JSON.parse(saved));
    }
    setIsHydrated(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('mindrender_sidebar_open', JSON.stringify(newState));
  };

  // ✅ OPCIONAL: Previne flash visual durante hidratação
  // Remove se preferir ver a transição
  if (!isHydrated) {
    return null; // ou um loading spinner
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      <div 
        style={{
          marginLeft: sidebarOpen ? '240px' : '64px',
          width: sidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 64px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >
        <Header sidebarOpen={sidebarOpen} />

        <main style={{ flex: 1, padding: '32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}