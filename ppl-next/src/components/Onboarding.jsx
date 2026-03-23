'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Onboarding.module.css'

const STEPS = [
  {
    icon: '🏋️',
    title: 'Track every rep',
    desc: 'Log sets in seconds. The app remembers your weights and nudges you when it\'s time to go heavier.',
    accent: 'var(--push)',
  },
  {
    icon: '📈',
    title: 'See your progress',
    desc: 'Volume landmarks, e1RM trends, body measurements, and streak tracking — all in one place.',
    accent: 'var(--pull)',
  },
  {
    icon: '🗓',
    title: 'Build your program',
    desc: 'Create your own workouts, assign them to days, and let the app tell you what\'s up today.',
    accent: 'var(--legs)',
  },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const router = useRouter()

  const isLast = step === STEPS.length - 1
  const s = STEPS[step]

  const handleNext = () => {
    if (isLast) {
      onDone()
      router.push('/programs')
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    onDone()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.sheet}>
        {/* Progress dots */}
        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`}
              style={i === step ? { background: s.accent } : {}}
            />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content} key={step}>
          <div className={styles.icon}>{s.icon}</div>
          <h2 className={styles.title}>{s.title}</h2>
          <p className={styles.desc}>{s.desc}</p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={`btn btn-primary ${styles.nextBtn}`}
            style={{ background: s.accent, borderColor: s.accent, color: '#0C0C0B' }}
            onClick={handleNext}
          >
            {isLast ? 'Set Up My Program →' : 'Next →'}
          </button>
          {!isLast && (
            <button className={styles.skipBtn} onClick={handleSkip}>
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
