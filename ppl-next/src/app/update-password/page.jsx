'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '../../lib/supabase-client'
import styles from '../login/login.module.css'

export default function UpdatePassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Exchange the code for a session on mount
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      setExchanging(false)
      return
    }

    const exchange = async () => {
      const supabase = getSupabase()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        setError('Reset link expired or already used. Please request a new one.')
      }
      setExchanging(false)
    }
    exchange()
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

      {exchanging ? (
        <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>Verifying reset link...</p>
      ) : done ? (
        <p style={{ textAlign: 'center', color: 'var(--success)', padding: '24px' }}>✓ Password updated — redirecting...</p>
      ) : error && !password ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
          <button className={`btn btn-primary`} onClick={() => router.push('/login')}>Back to Login</button>
        </div>
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
