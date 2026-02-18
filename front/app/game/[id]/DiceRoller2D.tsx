'use client';

import React, { useEffect, useState } from 'react';

// Reutilizamos o tipo se quiser, ou definimos aqui
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface DiceRollerProps {
  isRolling: boolean;
  result: number | null; // <--- ADICIONAMOS ISSO AQUI PARA CORRIGIR O ERRO
  diceType: DiceType;
  onComplete: () => void;
}

export default function DiceRoller2D({ isRolling, result, diceType, onComplete }: DiceRollerProps) {
  const [currentNumber, setCurrentNumber] = useState(1);
  const [internalRolling, setInternalRolling] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRolling) {
      setInternalRolling(true);
      // Efeito de "embaralhar" os números rapidinho
      interval = setInterval(() => {
        const max = parseInt(diceType.replace('d', ''));
        setCurrentNumber(Math.floor(Math.random() * max) + 1);
      }, 80);
    } else if (result !== null && internalRolling) {
      // O dado parou! Mostra o resultado final.
      if (interval!) clearInterval(interval);
      setCurrentNumber(result);
      
      // Mantém o resultado na tela por 1.5s antes de fechar
      const timeout = setTimeout(() => {
        setInternalRolling(false);
        onComplete();
      }, 1500);
      
      return () => clearTimeout(timeout);
    }

    return () => clearInterval(interval);
  }, [isRolling, result, diceType, internalRolling, onComplete]);

  // Se não estiver rolando e não tiver resultado pendente, não renderiza nada (esconde o overlay)
  if (!isRolling && !internalRolling) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', // Fundo escuro
      backdropFilter: 'blur(5px)', // Desfoque no fundo
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#09090b', // Zinco muito escuro
        border: '1px solid var(--neon-cyan, #22d3ee)', // Borda Neon
        borderRadius: '24px',
        padding: '40px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)', // Glow Cyan
        transform: 'scale(1)',
        transition: 'all 0.3s'
      }}>
        {/* Número Gigante */}
        <div style={{
          fontSize: '80px',
          fontWeight: '800',
          color: !isRolling && result !== null ? '#4ade80' : '#fff', // Verde se terminou, Branco rolando
          fontFamily: 'monospace',
          textShadow: !isRolling && result !== null ? '0 0 20px rgba(74, 222, 128, 0.5)' : 'none',
          lineHeight: 1
        }}>
          {currentNumber}
        </div>

        {/* Texto descritivo */}
        <div style={{
          marginTop: '20px',
          color: '#a1a1aa',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {isRolling ? `Rolando ${diceType}...` : 'Resultado'}
        </div>
      </div>
    </div>
  );
}