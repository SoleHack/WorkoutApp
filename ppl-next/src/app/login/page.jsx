'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../../lib/supabase-client'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const supabase = getSupabase()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.logoWrap}>
        <img src="/logo-dark.png" alt="PPL Tracker" className={`${styles.logo} ${styles.logoDark}`} />
        <img src="/logo-light.png" alt="PPL Tracker" className={`${styles.logo} ${styles.logoLight}`} />
      </div>

      <form className={styles.form} onSubmit={handle}>
        <div className={styles.tabs}>
          <button type="button"
            className={mode === 'login' ? styles.activeTab : styles.tab}
            onClick={() => setMode('login')}>Log in</button>
          <button type="button"
            className={mode === 'signup' ? styles.activeTab : styles.tab}
            onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <input className={styles.input} type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <input className={styles.input} type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} required />

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <button className={`btn btn-primary ${styles.submit}`} type="submit" disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className={styles.tagline}>WORKOUTS & PROGRESS</p>
    </div>
  )
}
