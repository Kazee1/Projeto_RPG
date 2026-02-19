'use client';

import React, { useEffect, useState } from 'react';

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface DiceRollerProps {
  isRolling: boolean;
  result: number | null;      // roll bruto
  diceType: DiceType;
  attrVal?: number;           // azul — valor do atributo base
  equipBonus?: number;        // roxo — bônus do equipamento
  classBonus?: number;        // verde — bônus da classe
  divisor?: number;           // 3 ou 4
  statusBonus?: number;       // resultado de floor((attrVal+equip+class)/divisor)
  skillCheck?: string;
  onComplete: () => void;
}

export default function DiceRoller2D({
  isRolling, result, diceType,
  attrVal = 0, equipBonus = 0, classBonus = 0,
  divisor = 3, statusBonus = 0,
  skillCheck, onComplete,
}: DiceRollerProps) {
  const [currentNumber, setCurrentNumber] = useState(1);
  const [internalRolling, setInternalRolling] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const total = result !== null ? result + statusBonus : null;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRolling) {
      setInternalRolling(true);
      setShowBreakdown(false);
      interval = setInterval(() => {
        const max = parseInt(diceType.replace('d', ''));
        setCurrentNumber(Math.floor(Math.random() * max) + 1);
      }, 80);
    } else if (result !== null && internalRolling) {
      if (interval!) clearInterval(interval);
      setCurrentNumber(result);
      setTimeout(() => setShowBreakdown(true), 350);
      const timeout = setTimeout(() => {
        setInternalRolling(false);
        setShowBreakdown(false);
        onComplete();
      }, 2800);
      return () => clearTimeout(timeout);
    }

    return () => clearInterval(interval);
  }, [isRolling, result, diceType, internalRolling, onComplete]);

  if (!isRolling && !internalRolling) return null;

  const done = !isRolling && result !== null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      animation: 'dFadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0c0c10, #18181f)',
        border: `1px solid ${done ? 'rgba(74,222,128,0.4)' : 'rgba(34,211,238,0.3)'}`,
        borderRadius: 28,
        padding: '44px 60px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        boxShadow: done
          ? '0 0 60px rgba(74,222,128,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 0 60px rgba(34,211,238,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
        minWidth: 300,
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>

        {/* ── Dado ── */}
        <div style={{
          width: 110, height: 110,
          background: done
            ? 'linear-gradient(135deg, #052e16, #022c1a)'
            : 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: `2px solid ${done ? '#4ade80' : '#22d3ee'}`,
          borderRadius: diceType === 'd6' ? 18 : '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, fontWeight: 800,
          color: done ? '#4ade80' : '#fff',
          fontFamily: '"Courier New", monospace',
          boxShadow: `0 0 28px ${done ? 'rgba(74,222,128,0.3)' : 'rgba(34,211,238,0.25)'}`,
          transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
          userSelect: 'none',
        }}>
          {currentNumber}
        </div>

        {/* ── Breakdown ── */}
        {done && showBreakdown && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            animation: 'dSlideUp 0.35s ease-out',
          }}>

            {/* Linha 1: componentes do status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.03)', borderRadius: 10,
              padding: '8px 14px', border: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 10, color: '#4b5563', marginRight: 2 }}>STATUS:</span>

              {/* Azul — atributo base */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 16, color: '#22d3ee', fontFamily: 'monospace', fontWeight: 800 }}>
                  {attrVal}
                </span>
                {skillCheck && (
                  <span style={{ fontSize: 7, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {skillCheck.substring(0, 3)}
                  </span>
                )}
              </div>

              {/* Roxo — equip */}
              {equipBonus !== 0 && (
                <>
                  <span style={{ fontSize: 12, color: '#374151' }}>+</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, color: '#a855f7', fontFamily: 'monospace', fontWeight: 800 }}>
                      {equipBonus}
                    </span>
                    <span style={{ fontSize: 7, color: '#a855f7', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      equip
                    </span>
                  </div>
                </>
              )}

              {/* Verde — classe */}
              {classBonus !== 0 && (
                <>
                  <span style={{ fontSize: 12, color: '#374151' }}>{classBonus >= 0 ? '+' : ''}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, color: classBonus >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', fontWeight: 800 }}>
                      {classBonus}
                    </span>
                    <span style={{ fontSize: 7, color: classBonus >= 0 ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      classe
                    </span>
                  </div>
                </>
              )}

              {/* Divisor */}
              <span style={{ fontSize: 12, color: '#374151' }}>÷</span>
              <span style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace', fontWeight: 700 }}>
                {divisor}
              </span>
              <span style={{ fontSize: 12, color: '#374151' }}>=</span>
              <span style={{ fontSize: 18, color: statusBonus >= 0 ? '#fbbf24' : '#ef4444', fontFamily: 'monospace', fontWeight: 800 }}>
                {statusBonus >= 0 ? '+' : ''}{statusBonus}
              </span>
            </div>

            {/* Linha 2: dado + bônus = total */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 26, color: '#e5e7eb', fontFamily: 'monospace', fontWeight: 800 }}>
                {result}
              </span>
              {statusBonus !== 0 && (
                <>
                  <span style={{ fontSize: 16, color: '#4b5563' }}>{statusBonus >= 0 ? '+' : ''}</span>
                  <span style={{ fontSize: 22, color: statusBonus >= 0 ? '#fbbf24' : '#ef4444', fontFamily: 'monospace', fontWeight: 800 }}>
                    {statusBonus}
                  </span>
                </>
              )}
              <span style={{ fontSize: 20, color: '#374151' }}>=</span>
              <span style={{
                fontSize: 40, color: '#4ade80', fontFamily: 'monospace', fontWeight: 800,
                textShadow: '0 0 20px rgba(74,222,128,0.5)',
              }}>
                {total}
              </span>
            </div>
          </div>
        )}

        {/* Label */}
        <div style={{
          color: '#4b5563', textTransform: 'uppercase',
          letterSpacing: 3, fontSize: 10, fontWeight: 700,
        }}>
          {isRolling ? `Rolando ${diceType}...` : 'Resultado Final'}
        </div>
      </div>

      <style>{`
        @keyframes dSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
