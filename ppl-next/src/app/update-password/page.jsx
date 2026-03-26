'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../../lib/supabase-client'
import styles from '../login/login.module.css'

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Wait for session to be available after middleware exchange
    const checkSession = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
      } else {
        // Listen for auth state change — session may arrive slightly after page load
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setReady(true)
            subscription.unsubscribe()
          }
        })
        // Timeout fallback
        setTimeout(() => {
          setReady(true)
          subscription.unsubscribe()
        }, 3000)
      }
    }
    checkSession()
  }, [])

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.logoWrap}>
        <img src="/logo-dark.png" alt="PPL Tracker" className={`${styles.logo} ${styles.logoDark}`} />
        <img src="/logo-light.png" alt="PPL Tracker" className={`${styles.logo} ${styles.logoLight}`} />
      </div>

      {done ? (
        <p style={{ textAlign: 'center', color: 'var(--success)', padding: '24px' }}>
          ✓ Password updated — redirecting...
        </p>
      ) : !ready ? (
        <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
          Verifying session...
        </p>
      ) : (
        <form className={styles.form} onSubmit={handle}>
          <div className={styles.resetHeader}>
            <div className={styles.resetTitle}>Set New Password</div>
            <div className={styles.resetSub}>Choose a new password for your account.</div>
          </div>
          <input className={styles.input} type="password" placeholder="New password"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <input className={styles.input} type="password" placeholder="Confirm new password"
            value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          {error && <p className={styles.error}>{error}</p>}
          <button className={`btn btn-primary ${styles.submit}`} type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}

      <p className={styles.tagline}>WORKOUTS & PROGRESS</p>
    </div>
  )
}
