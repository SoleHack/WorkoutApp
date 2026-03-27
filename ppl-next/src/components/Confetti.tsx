'use client'
import { useEffect, useRef } from 'react'
import styles from './Confetti.module.css'

const COLORS = ['#F59E0B', '#38BDF8', '#4ADE80', '#C084FC', '#F87171', '#FFFFFF']

function randomBetween(a, b) { return a + Math.random() * (b - a) }

export default function Confetti({ active, onDone }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particles = useRef([])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Spawn particles
    particles.current = Array.from({ length: 120 }, () => ({
      x: randomBetween(0.2, 0.8) * canvas.width,
      y: randomBetween(-0.1, 0.3) * canvas.height,
      vx: randomBetween(-3, 3),
      vy: randomBetween(-8, -2),
      size: randomBetween(6, 12),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: randomBetween(0, Math.PI * 2),
      rotSpeed: randomBetween(-0.15, 0.15),
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      life: 1,
      decay: randomBetween(0.008, 0.015),
    }))

    let running = true
    const tick = () => {
      if (!running) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.current = particles.current.filter(p => p.life > 0)

      particles.current.forEach(p => {
        p.x += p.vx
        p.vy += 0.18 // gravity
        p.y += p.vy
        p.rotation += p.rotSpeed
        p.life -= p.decay

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      if (particles.current.length === 0) {
        running = false
        onDone?.()
        return
      }
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [active])

  if (!active) return null

  return <canvas ref={canvasRef} className={styles.canvas} />
}
