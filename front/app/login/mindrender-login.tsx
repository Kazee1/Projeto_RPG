'use client';

import { supabase } from '@/utils/supabase/supabaseClientregister';
import { useRouter } from 'next/navigation'
import { useState } from 'react';
import styles from '@/styles/mindrender-login.module.css';

export default function MindRenderLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/home')
  }


  return (
    <div className={styles.mindrenderContainer}>
      {/* Animated foggy background - Usando template literals para combinar classes */}
      <div className={`${styles.fogLayer} ${styles.fog1}`}></div>
      <div className={`${styles.fogLayer} ${styles.fog2}`}></div>
      <div className={`${styles.fogLayer} ${styles.fog3}`}></div>

      {/* Login panel */}
      <div className={styles.loginPanel}>
        {/* Logo and title */}
        <div className={styles.headerSection}>
          <h1 className={styles.logoTitle}>MindRender</h1>
          <p className={styles.tagline}>Renderize sua próxima aventura.</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.glassInput}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.glassInput}
              required
            />
          </div>

          <button type="submit" className={styles.awakenButton} disabled={loading}>
            {loading ? "Entrando..." : "ACORDAR NO MUNDO"}
          </button>
          {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
        </form>

        {/* Footer links */}
        <div className={styles.footerLinks}>
          <a href="/register" className={styles.link}>Criar conta</a>
          <span className={styles.separator}>|</span>
          <a href="/recovery" className={styles.link}>Recuperar acesso</a>
        </div>
      </div>
    </div>
  );
}