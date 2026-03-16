import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import styles from './Login.module.css'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
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
        <div className={styles.tabs}>
          <button type="button" className={mode === 'login' ? styles.activeTab : styles.tab} onClick={() => setMode('login')}>Log in</button>
          <button type="button" className={mode === 'signup' ? styles.activeTab : styles.tab} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <button className={`btn btn-primary ${styles.submit}`} type="submit" disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
