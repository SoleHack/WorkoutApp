'use client'
import { useCallback } from 'react'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function useWorkoutShare() {
  const generateImage = useCallback(async ({ dayKey, sets, duration, prs, day }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, 1920)
    bg.addColorStop(0, '#0C0C0B')
    bg.addColorStop(1, '#1A1A17')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1080, 1920)

    // Accent bar
    ctx.fillStyle = day?.color || '#F59E0B'
    ctx.fillRect(0, 0, 1080, 8)

    // App name
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '500 32px monospace'
    ctx.fillText('PPL TRACKER', 80, 100)

    // Day info
    ctx.fillStyle = day?.color || '#F59E0B'
    ctx.font = '600 36px monospace'
    ctx.fillText((day?.day || '').toUpperCase(), 80, 160)

    ctx.fillStyle = '#E8E3D8'
    ctx.font = 'bold 110px serif'
    ctx.fillText((day?.label || 'WORKOUT').toUpperCase(), 80, 310)

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(80, 350)
    ctx.lineTo(1000, 350)
    ctx.stroke()

    // Stats
    const totalSets = (Object.values(sets) as any[]).reduce((a: number, s: any) => a + (s || []).filter((x: any) => x?.completed).length, 0)
    const totalVol = (Object.values(sets) as any[]).reduce((a: number, exSets: any) =>
      a + (exSets || []).filter((s: any) => s?.completed).reduce((b: number, s: any) => b + ((s.weight || 0) * (s.reps || 0)), 0), 0)
    const mins = Math.floor((duration || 0) / 60)

    const stats = [
      { val: `${mins}`, label: 'MIN' },
      { val: `${totalSets}`, label: 'SETS' },
      { val: `${Math.round(totalVol / 1000 * 10) / 10}K`, label: 'LBS' },
    ]

    stats.forEach((s, i) => {
      const x = 80 + i * 320
      ctx.fillStyle = day?.color || '#F59E0B'
      ctx.font = 'bold 80px monospace'
      ctx.fillText(s.val, x, 480)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '400 26px monospace'
      ctx.fillText(s.label, x, 520)
    })

    // PRs
    if (prs?.length > 0) {
      ctx.fillStyle = 'rgba(245,158,11,0.1)'
      roundRect(ctx, 80, 580, 920, Math.min(prs.length, 5) * 72 + 80, 16)
      ctx.fill()

      ctx.fillStyle = '#F59E0B'
      ctx.font = '600 30px monospace'
      ctx.fillText(`🏆  ${prs.length} NEW PR${prs.length > 1 ? 'S' : ''}`, 120, 640)

      prs.slice(0, 5).forEach((pr, i) => {
        const y = 700 + i * 72
        ctx.fillStyle = '#E8E3D8'
        ctx.font = '500 26px monospace'
        const prName = (pr.name || pr.exerciseId || '').replace(/-/g, ' ').toUpperCase().slice(0, 28)
        ctx.fillText(prName, 120, y)
        ctx.fillStyle = day?.color || '#F59E0B'
        ctx.font = 'bold 30px monospace'
        const wLabel = pr.weight > 0 ? `${pr.weight}lbs × ${pr.reps}` : `BW × ${pr.reps}`
        ctx.fillText(wLabel, 750, y, 240)
      })
    }

    // Date footer
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.font = '400 26px monospace'
    const appUrl = (typeof window !== 'undefined' ? window.location.hostname : 'jnworkoutapp.vercel.app')
    ctx.fillText(appUrl, 80, 1860)
    ctx.fillStyle = day?.color || '#F59E0B'
    ctx.font = '500 26px monospace'
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    ctx.fillText(dateStr, 1000 - ctx.measureText(dateStr).width, 1860)

    return canvas.toDataURL('image/png')
  }, [])

  const share = useCallback(async (imageData, title = 'My PPL Workout') => {
    const res = await fetch(imageData)
    const blob = await res.blob()
    const file = new File([blob], 'workout.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, text: 'Crushed today\'s session 💪', files: [file] })
    } else {
      const a = document.createElement('a')
      a.href = imageData
      a.download = 'workout.png'
      a.click()
    }
  }, [])

  return { generateImage, share }
}
