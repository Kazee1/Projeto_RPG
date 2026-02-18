'use client';

import { useState } from 'react';
import styles from '@/styles/mindrender-login.module.css';

export default function MindRenderRecovery() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Recovery requested for:', email);
    // Simula o envio do email
    setSubmitted(true);
  };

  return (
    <div className={styles.mindrenderContainer}>
      <div className={`${styles.fogLayer} ${styles.fog1}`}></div>
      <div className={`${styles.fogLayer} ${styles.fog2}`}></div>
      <div className={`${styles.fogLayer} ${styles.fog3}`}></div>

      <div className={styles.loginPanel}>
        <div className={styles.headerSection}>
          <h1 className={styles.logoTitle}>MindRender</h1>
          <p className={styles.tagline}>
            {submitted ? "Sinal enviado." : "Restaurar conexão neural."}
          </p>
        </div>

        {!submitted ? (
          /* Formulário de Recuperação */
          <form onSubmit={handleRecovery} className={styles.loginForm}>
            <div className={styles.inputGroup}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>
                Digite seu email para receber um glifo de resgate.
              </p>
              <input
                type="email"
                placeholder="Email registrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.glassInput}
                required
              />
            </div>

            <button type="submit" className={styles.awakenButton}>
              RASTREAR ACESSO
            </button>
          </form>
        ) : (
          /* Mensagem de Sucesso (Visualização condicional) */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>📩</div>
            <p style={{ color: '#fff', lineHeight: '1.6' }}>
              Um link de recuperação foi enviado para <strong>{email}</strong>.
              <br />
              Verifique sua caixa de entrada (e o spam).
            </p>
            <button 
              onClick={() => setSubmitted(false)} 
              className={styles.link} 
              style={{ background: 'none', border: 'none', marginTop: '20px', cursor: 'pointer' }}
            >
              Tentar outro email
            </button>
          </div>
        )}

        <div className={styles.footerLinks}>
          <a href="/login" className={styles.link}>Voltar para Login</a>
        </div>
      </div>
    </div>
  );
}