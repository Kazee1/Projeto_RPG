'use client';

import { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react'; // CheckCircle removido se não usado
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // Import necessário
import { supabase } from '@/utils/supabase/supabaseClientregister'; // Import necessário
import styles from '@/styles/auth.module.css';

export default function MindRenderVerify() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email'); // Pega o email da URL

  const [timer, setTimer] = useState(60); // Começa com 60s para evitar spam logo de cara
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Lógica do Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (!email) {
        setMessage("Erro: Email não encontrado.");
        return;
    }

    setIsResending(true);
    setMessage(null);

    // Chamada real ao Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    setIsResending(false);

    if (error) {
      // O Supabase tem limite de taxa, se tentar muito rápido ele dá erro 429
      setMessage("Aguarde um momento antes de tentar novamente.");
    } else {
      setTimer(60); // Reseta timer
      setMessage("Novo link enviado com sucesso!");
    }
  };

  return (
    <div className={styles.authContainer}>
      
      <div className={styles.gridBackground}></div>

      <div className={styles.authCard} style={{ textAlign: 'center' }}>
        
        <div className={styles.iconCircle}>
          <Mail size={40} />
        </div>

        <div className={styles.logoArea}>
          <h2 className={styles.logoText} style={{fontSize: '24px', marginBottom: '8px'}}>
            Verifique seu Email
          </h2>
          <p className={styles.subtitle}>Link de Sincronização Enviado</p>
        </div>

        {/* Texto Informativo */}
        <div className={styles.instructionText} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Enviamos um link de acesso seguro para:
          </p>
          
          {/* Exibe o email dinâmico ou um placeholder se não houver */}
          <div className={styles.emailHighlight} style={{ fontSize: '16px', marginTop: '8px', color: '#fff' }}>
            {email || 'seu email'}
          </div>
          
          <p style={{ fontSize: '12px', marginTop: '16px', color: 'var(--text-secondary)' }}>
            Clique no link enviado para conectar-se automaticamente ao Nexus. Você pode fechar esta aba após confirmar.
          </p>
        </div>

        {/* Área de Ação e Feedback */}
        <div style={{ marginTop: '32px' }}>
            
            {/* Mensagem de feedback (sucesso ou erro) */}
            {message && (
                <p style={{ fontSize: '12px', color: message.includes('sucesso') ? '#4ade80' : '#f87171', marginBottom: '10px' }}>
                    {message}
                </p>
            )}

            <button 
                onClick={handleResend}
                disabled={timer > 0 || isResending || !email}
                className={styles.resendButton}
            >
                {isResending ? (
                <RefreshCw className="spin" size={18} />
                ) : timer > 0 ? (
                `Reenviar em ${timer}s`
                ) : (
                <>
                    <RefreshCw size={18} /> Reenviar Link
                </>
                )}
            </button>
        </div>

        <div className={styles.toggleArea} style={{ marginTop: '24px' }}>
          <Link href="/login" style={{ textDecoration: 'none', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', transition: 'color 0.2s' }}>
            <ArrowLeft size={14} /> Voltar para Login
          </Link>
        </div>

      </div>
    </div>
  );
}