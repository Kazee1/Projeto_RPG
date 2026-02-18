'use client';

import React, { useEffect, useState } from 'react';

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface Dice2DProps {
  type: DiceType;
  value: number;
  isRolling: boolean;
  size?: number;
  color?: string;
}

// Configurações de cores e gradientes (Estilo Neon/Cyberpunk)
const getGradients = (type: string) => {
  const map: Record<string, any> = {
    'd4': { bg: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', text: '#fff', border: '#fca5a5' },
    'd6': { bg: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)', text: '#fff', border: '#93c5fd' }, // Azul
    'd8': { bg: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)', text: '#fff', border: '#d8b4fe' },
    'd10': { bg: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)', text: '#fff', border: '#6ee7b7' },
    'd12': { bg: 'linear-gradient(135deg, #f59e0b 0%, #78350f 100%)', text: '#fff', border: '#fcd34d' },
    'd20': { bg: 'linear-gradient(135deg, #111827 0%, #000000 100%)', text: '#22d3ee', border: '#22d3ee' },
  };
  return map[type] || map['d20'];
};

export default function Dice2D({ type, value, isRolling, size = 120 }: Dice2DProps) {
  const styles = getGradients(type); 
  const [anim, setAnim] = useState({ x: 0, y: 0, rot: 0, scale: 1 });

  // Efeito de "Shake" frenético
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRolling) {
      interval = setInterval(() => {
        setAnim({
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20,
          rot: (Math.random() - 0.5) * 30,
          scale: 1.1
        });
      }, 50);
    } else {
      // Estado de repouso (Reset)
      setAnim({ x: 0, y: 0, rot: 0, scale: 1 });
    }
    return () => clearInterval(interval);
  }, [isRolling]);

  // Estilo Base do Container
  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Fonte grande e legível para todos os dados
    fontSize: `${size * 0.5}px`, 
    fontWeight: 800,
    color: styles.text,
    background: styles.bg,
    boxShadow: isRolling 
      ? `0 0 20px ${styles.border}` 
      : `inset 0 0 20px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5), 0 0 15px ${styles.border}40`,
    transition: isRolling ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: `translate(${anim.x}px, ${anim.y}px) rotate(${anim.rot}deg) scale(${anim.scale})`,
    position: 'relative',
    border: type === 'd20' ? 'none' : `3px solid ${styles.border}`, // D20 usa border interna
    textShadow: `0 2px 10px rgba(0,0,0,0.5)`,
    fontFamily: '"Courier New", Courier, monospace', // Fonte monoespaçada fica legal em RPG
  };

  // --- RENDERIZAÇÃO POR TIPO ---

  // D6: Quadrado com bordas arredondadas (Cubo) e NÚMERO
  if (type === 'd6') {
    return (
      <div style={{ ...containerStyle, borderRadius: '16%' }}>
        {value}
      </div>
    );
  }

  // D20: Hexágono (Mantido igual pois é icônico)
  if (type === 'd20') {
    return (
      <div style={{
        ...containerStyle,
        width: `${size}px`,
        height: `${size * 0.88}px`, // Ajuste visual hexagonal
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        fontSize: `${size * 0.4}px`, // Um pouco menor para caber no hexágono
      }}>
        {/* Borda simulada interna para o D20 */}
        <div style={{
           position: 'absolute', inset: 0, 
           boxShadow: `inset 0 0 0 4px ${styles.border}`, 
           clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
           pointerEvents: 'none'
        }} />
        <span style={{zIndex: 2}}>{value}</span>
      </div>
    );
  }

  // Genérico (D4, D8, D10, D12): Círculo por enquanto
  // Se quiser diferenciar mais, podemos adicionar clip-path para triângulo/losango depois
  return (
    <div style={{ ...containerStyle, borderRadius: '50%' }}>
      {value}
    </div>
  );
}