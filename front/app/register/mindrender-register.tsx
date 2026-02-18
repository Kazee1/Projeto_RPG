'use client';

import { supabase } from '@/utils/supabase/supabaseClientregister';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from '@/styles/mindrender-login.module.css';

export default function MindRenderRegister() {

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPass) {
      setError("As chaves de acesso não coincidem.")
      return
    }

    setLoading(true)
    setError(null)

    // Ajuste importante: Certifique-se de configurar o emailRedirectTo
    // para a rota que arrumamos anteriormente (/auth/callback)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: username
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // MUDANÇA AQUI: Passamos o email via query param
    router.push(`/verify?email=${encodeURIComponent(email)}`)
  }

  // ... O restante do seu JSX (render) continua igual ...
  return (
    <div className={styles.mindrenderContainer}>
      {/* ... mantenha o conteúdo do seu JSX original ... */}
       <div className={`${styles.fogLayer} ${styles.fog1}`}></div>
       <div className={`${styles.fogLayer} ${styles.fog2}`}></div>
       <div className={`${styles.fogLayer} ${styles.fog3}`}></div>

       <div className={styles.loginPanel}>
        {/* ... cabeçalho ... */}
         <div className={styles.headerSection}>
           <h1 className={styles.logoTitle} style={{ fontSize: '32px' }}>MindRender</h1>
           <p className={styles.tagline}>Inicie sua primeira crônica.</p>
         </div>

         <form onSubmit={handleRegister} className={styles.loginForm}>
            {/* Inputs... (sem alterações necessárias no JSX visual) */}
            <div className={styles.compactGroup}>
             <input
               type="text"
               placeholder="Nome de Viajante"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               className={styles.compactInput}
               required
             />
           </div>

           <div className={styles.compactGroup}>
             <input
               type="email"
               placeholder="Email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               className={styles.compactInput}
               required
             />
           </div>

           <div className={styles.compactGroup}>
             <input
               type="password"
               placeholder="Senha"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className={styles.compactInput}
               required
             />
           </div>

           <div className={styles.compactGroup}>
             <input
               type="password"
               placeholder="Confirmar Senha"
               value={confirmPass}
               onChange={(e) => setConfirmPass(e.target.value)}
               className={styles.compactInput}
               required
             />
           </div>

           <button type="submit" className={styles.awakenButton} disabled={loading}>
             {loading ? "Criando..." : "CRIAR REALIDADE"}
           </button>
           {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
         </form>

         <div className={styles.footerLinks} style={{ paddingTop: '15px' }}>
           <span className={styles.link} style={{ cursor: 'default', color: 'rgba(255,255,255,0.4)' }}>
             Já possui uma história?
           </span>
           <span className={styles.separator}>|</span>
           <a href="/login" className={styles.link}>Entrar</a>
         </div>
       </div>
    </div>
  );
}