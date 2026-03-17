import { useState } from 'react'
import styles from './BodyMap.module.css'

// Maps program.js muscle names to the original SVG IDs
const MUSCLE_TO_IDS = {
  'Upper Chest':      ['chest-upper'],
  'Lower Chest':      ['chest-lower'],
  'Front Deltoid':    ['shoulders-front'],
  'Lateral Deltoid':  ['shoulders-side'],
  'Rear Deltoid':     ['rear-delt'],
  'Triceps':          ['triceps'],
  'Biceps':           ['biceps'],
  'Latissimus Dorsi': ['lats'],
  'Rhomboids':        ['rhomboids'],
  'Trapezius':        ['traps'],
  'Quadriceps':       ['quads'],
  'Hamstrings':       ['hamstrings'],
  'Glutes':           ['glutes'],
  'Calves':           ['calves-front', 'calves-back'],
  'Core / Abs':       ['abs'],
  'Lower Back':       ['lower-back'],
  'Hip Flexors':      ['hip-flexors'],
}

function getHighlighted(muscles, dayColor) {
  const primary = new Set()
  const secondary = new Set()
  muscles?.primary?.forEach(m => MUSCLE_TO_IDS[m]?.forEach(id => primary.add(id)))
  muscles?.secondary?.forEach(m => MUSCLE_TO_IDS[m]?.forEach(id => {
    if (!primary.has(id)) secondary.add(id)
  }))

  const gc = (id) => {
    if (primary.has(id)) return `${dayColor}CC`
    if (secondary.has(id)) return `${dayColor}44`
    return 'transparent'
  }
  return gc
}

function BodySVG({ gc, view }) {
  const bf = 'rgba(255,255,255,0.04)'
  const bs = 'rgba(255,255,255,0.14)'

  const body = (
    <>
      <circle cx="65" cy="17" r="13" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="59" y="30" width="12" height="10" rx="3" fill={bf} stroke={bs} strokeWidth="1"/>
      <ellipse cx="30" cy="52" rx="14" ry="11" fill={bf} stroke={bs} strokeWidth="1"/>
      <ellipse cx="100" cy="52" rx="14" ry="11" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="35" y="42" width="60" height="74" rx="10" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="14" y="55" width="16" height="50" rx="7" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="100" y="55" width="16" height="50" rx="7" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="15" y="108" width="14" height="38" rx="6" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="101" y="108" width="14" height="38" rx="6" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="30" y="116" width="70" height="22" rx="8" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="33" y="138" width="24" height="62" rx="10" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="73" y="138" width="24" height="62" rx="10" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="35" y="204" width="20" height="50" rx="7" fill={bf} stroke={bs} strokeWidth="1"/>
      <rect x="75" y="204" width="20" height="50" rx="7" fill={bf} stroke={bs} strokeWidth="1"/>
      <ellipse cx="47" cy="257" rx="12" ry="5" fill={bf} stroke={bs} strokeWidth="1"/>
      <ellipse cx="83" cy="257" rx="12" ry="5" fill={bf} stroke={bs} strokeWidth="1"/>
    </>
  )

  const front = (
    <>
      <ellipse cx="65" cy="54" rx="24" ry="9" fill={gc('chest-upper')}/>
      <ellipse cx="65" cy="73" rx="21" ry="9" fill={gc('chest-lower')}/>
      <ellipse cx="30" cy="52" rx="12" ry="9" fill={gc('shoulders-front')}/>
      <ellipse cx="100" cy="52" rx="12" ry="9" fill={gc('shoulders-front')}/>
      <ellipse cx="16" cy="65" rx="6" ry="8" fill={gc('shoulders-side')}/>
      <ellipse cx="114" cy="65" rx="6" ry="8" fill={gc('shoulders-side')}/>
      <ellipse cx="22" cy="80" rx="7" ry="12" fill={gc('biceps')}/>
      <ellipse cx="108" cy="80" rx="7" ry="12" fill={gc('biceps')}/>
      <ellipse cx="65" cy="88" rx="17" ry="20" fill={gc('abs')}/>
      <ellipse cx="65" cy="126" rx="22" ry="8" fill={gc('hip-flexors')}/>
      <ellipse cx="45" cy="164" rx="11" ry="24" fill={gc('quads')}/>
      <ellipse cx="85" cy="164" rx="11" ry="24" fill={gc('quads')}/>
      <ellipse cx="45" cy="226" rx="9" ry="19" fill={gc('calves-front')}/>
      <ellipse cx="85" cy="226" rx="9" ry="19" fill={gc('calves-front')}/>
    </>
  )

  const back = (
    <>
      <ellipse cx="65" cy="49" rx="25" ry="11" fill={gc('traps')}/>
      <ellipse cx="30" cy="52" rx="12" ry="9" fill={gc('rear-delt')}/>
      <ellipse cx="100" cy="52" rx="12" ry="9" fill={gc('rear-delt')}/>
      <ellipse cx="38" cy="76" rx="11" ry="24" fill={gc('lats')}/>
      <ellipse cx="92" cy="76" rx="11" ry="24" fill={gc('lats')}/>
      <ellipse cx="65" cy="64" rx="18" ry="10" fill={gc('rhomboids')}/>
      <ellipse cx="65" cy="97" rx="18" ry="14" fill={gc('lower-back')}/>
      <ellipse cx="22" cy="83" rx="7" ry="13" fill={gc('triceps')}/>
      <ellipse cx="108" cy="83" rx="7" ry="13" fill={gc('triceps')}/>
      <ellipse cx="45" cy="142" rx="19" ry="14" fill={gc('glutes')}/>
      <ellipse cx="85" cy="142" rx="19" ry="14" fill={gc('glutes')}/>
      <ellipse cx="45" cy="170" rx="12" ry="26" fill={gc('hamstrings')}/>
      <ellipse cx="85" cy="170" rx="12" ry="26" fill={gc('hamstrings')}/>
      <ellipse cx="45" cy="226" rx="9" ry="19" fill={gc('calves-back')}/>
      <ellipse cx="85" cy="226" rx="9" ry="19" fill={gc('calves-back')}/>
    </>
  )

  return (
    <svg viewBox="0 0 130 268" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
      {body}
      {view === 'front' ? front : back}
    </svg>
  )
}

export default function BodyMap({ muscles, dayColor, expanded, onToggle }) {
  const gc = getHighlighted(muscles, dayColor)

  if (!expanded) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.figures}>
        <div className={styles.figure}>
          <BodySVG gc={gc} view="front" />
          <span className={styles.label}>Front</span>
        </div>
        <div className={styles.figure}>
          <BodySVG gc={gc} view="back" />
          <span className={styles.label}>Back</span>
        </div>
      </div>
    </div>
  )
}
