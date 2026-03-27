'use client'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getSupabase } from '../lib/supabase-client'
import styles from './Login.module.css'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
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

    if (mode === 'reset') {
      const supabase = getSupabase()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) setError(error.message)
      else setMessage('Check your email for a password reset link.')
      setLoading(false)
      return
    }

    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email, password)
    if (error) setError(error.message)
    else if (mode === 'signup') setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.logo}>
        <span className={styles.push}>Push</span>
        <span className={styles.pull}>Pull</span>
        <span className={styles.legs}>Legs</span>
      </div>
      <p className={styles.sub}>6-Day Recomp Tracker</p>

      <form className={styles.form} onSubmit={handle}>
        {mode !== 'reset' && (
          <div className={styles.tabs}>
            <button type="button" className={mode === 'login' ? styles.activeTab : styles.tab} onClick={() => setMode('login')}>Log in</button>
            <button type="button" className={mode === 'signup' ? styles.activeTab : styles.tab} onClick={() => setMode('signup')}>Sign up</button>
          </div>
        )}

        {mode === 'reset' && (
          <div className={styles.resetHeader}>
            <div className={styles.resetTitle}>Reset Password</div>
            <div className={styles.resetSub}>Enter your email and we'll send a reset link.</div>
          </div>
        )}

        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        {mode !== 'reset' && (
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        )}

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <button className={`btn btn-primary ${styles.submit}`} type="submit" disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>

        {mode === 'login' && (
          <button type="button" className={styles.forgotBtn} onClick={() => { setMode('reset'); setError(''); setMessage('') }}>
            Forgot password?
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className={styles.forgotBtn} onClick={() => { setMode('login'); setError(''); setMessage('') }}>
            ← Back to login
          </button>
        )}
      </form>
    </div>
  )
}
