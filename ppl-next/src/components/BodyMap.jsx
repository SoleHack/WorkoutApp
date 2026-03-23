'use client'
import styles from './BodyMap.module.css'

const MUSCLE_IDS = {
  'Upper Chest':      ['chest-upper'],
  'Lower Chest':      ['chest-lower'],
  'Front Deltoid':    ['ant-delt-l','ant-delt-r'],
  'Lateral Deltoid':  ['lat-delt-l','lat-delt-r'],
  'Rear Deltoid':     ['rear-delt-l','rear-delt-r'],
  'Triceps':          ['tricep-l','tricep-r'],
  'Biceps':           ['bicep-l','bicep-r'],
  'Latissimus Dorsi': ['lat-l','lat-r'],
  'Rhomboids':        ['rhomboid-l','rhomboid-r'],
  'Trapezius':        ['trap-l','trap-r'],
  'Quadriceps':       ['quad-l','quad-r'],
  'Hamstrings':       ['ham-l','ham-r'],
  'Glutes':           ['glute-l','glute-r'],
  'Calves':           ['calf-l','calf-r'],
  'Core / Abs':       ['abs'],
  'Lower Back':       ['lower-back'],
  'Hip Flexors':      ['hip-l','hip-r'],
}

function buildSets(muscles) {
  const primary = new Set()
  const secondary = new Set()
  muscles?.primary?.forEach(m => MUSCLE_IDS[m]?.forEach(id => primary.add(id)))
  muscles?.secondary?.forEach(m => MUSCLE_IDS[m]?.forEach(id => { if (!primary.has(id)) secondary.add(id) }))
  return { primary, secondary }
}

function FrontSVG({ gc }) {
  const bg = 'var(--bg3)'
  const bd = 'var(--border2)'

  return (
    <svg viewBox="0 0 120 310" className={styles.svg} xmlns="http://www.w3.org/2000/svg">
      {/* ── Body silhouette ── */}
      {/* Head */}
      <ellipse cx="60" cy="20" rx="16" ry="18" fill={bg} stroke={bd} strokeWidth="1"/>
      {/* Neck */}
      <path d="M53,36 L67,36 L65,50 L55,50 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left shoulder cap */}
      <ellipse cx="30" cy="65" rx="14" ry="13" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right shoulder cap */}
      <ellipse cx="90" cy="65" rx="14" ry="13" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Torso */}
      <path d="M38,52 L82,52 L88,64 L92,90 L88,130 L80,145 L40,145 L32,130 L28,90 L32,64 Z"
        fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left upper arm */}
      <path d="M20,60 L32,58 L34,108 L20,112 Z" fill={bg} stroke={bd} strokeWidth="0.8" rx="6"/>
      {/* Right upper arm */}
      <path d="M100,60 L88,58 L86,108 L100,112 Z" fill={bg} stroke={bd} strokeWidth="0.8" rx="6"/>
      {/* Left forearm */}
      <path d="M18,112 L32,110 L30,148 L17,145 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right forearm */}
      <path d="M102,112 L88,110 L90,148 L103,145 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left hand */}
      <ellipse cx="23" cy="154" rx="7" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right hand */}
      <ellipse cx="97" cy="154" rx="7" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Pelvis/hip */}
      <path d="M32,130 L88,130 L92,148 L82,155 L38,155 L28,148 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left upper leg */}
      <path d="M38,155 L58,155 L56,220 L36,218 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right upper leg */}
      <path d="M62,155 L82,155 L84,218 L64,220 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left knee */}
      <ellipse cx="46" cy="222" rx="12" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right knee */}
      <ellipse cx="74" cy="222" rx="12" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left lower leg */}
      <path d="M36,228 L56,228 L54,276 L38,276 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right lower leg */}
      <path d="M64,228 L84,228 L82,276 L66,276 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Left foot */}
      <ellipse cx="44" cy="282" rx="12" ry="6" fill={bg} stroke={bd} strokeWidth="0.8"/>
      {/* Right foot */}
      <ellipse cx="76" cy="282" rx="12" ry="6" fill={bg} stroke={bd} strokeWidth="0.8"/>

      {/* ── Muscle overlays ── */}
      {/* Anterior delts */}
      <ellipse id="ant-delt-l" cx="30" cy="65" rx="12" ry="11" fill={gc('ant-delt-l')} stroke="none"/>
      <ellipse id="ant-delt-r" cx="90" cy="65" rx="12" ry="11" fill={gc('ant-delt-r')} stroke="none"/>
      {/* Lateral delts */}
      <ellipse id="lat-delt-l" cx="20" cy="68" rx="6" ry="8" fill={gc('lat-delt-l')} stroke="none"/>
      <ellipse id="lat-delt-r" cx="100" cy="68" rx="6" ry="8" fill={gc('lat-delt-r')} stroke="none"/>
      {/* Upper chest */}
      <path id="chest-upper" d="M40,54 Q60,50 80,54 L78,70 Q60,66 42,70 Z" fill={gc('chest-upper')} stroke="none"/>
      {/* Lower chest */}
      <path id="chest-lower" d="M42,70 Q60,66 78,70 L75,84 Q60,80 45,84 Z" fill={gc('chest-lower')} stroke="none"/>
      {/* Abs */}
      <path id="abs" d="M45,84 Q60,80 75,84 L73,130 Q60,128 47,130 Z" fill={gc('abs')} stroke="none"/>
      {/* Abs grid lines when active */}
      {gc('abs') !== 'transparent' && <>
        <line x1="60" y1="84" x2="60" y2="130" stroke="var(--bg2)" strokeWidth="1" opacity="0.4"/>
        <line x1="44" y1="100" x2="76" y2="100" stroke="var(--bg2)" strokeWidth="0.8" opacity="0.4"/>
        <line x1="44" y1="115" x2="76" y2="115" stroke="var(--bg2)" strokeWidth="0.8" opacity="0.4"/>
      </>}
      {/* Biceps */}
      <path id="bicep-l" d="M22,60 L32,58 L33,98 L21,100 Z" fill={gc('bicep-l')} stroke="none"/>
      <path id="bicep-r" d="M98,60 L88,58 L87,98 L99,100 Z" fill={gc('bicep-r')} stroke="none"/>
      {/* Hip flexors */}
      <path id="hip-l" d="M38,130 L58,130 L57,152 L36,150 Z" fill={gc('hip-l')} stroke="none"/>
      <path id="hip-r" d="M62,130 L82,130 L84,150 L63,152 Z" fill={gc('hip-r')} stroke="none"/>
      {/* Quads */}
      <path id="quad-l" d="M38,155 L57,155 L55,218 L36,216 Z" fill={gc('quad-l')} stroke="none"/>
      <path id="quad-r" d="M63,155 L82,155 L84,216 L65,218 Z" fill={gc('quad-r')} stroke="none"/>
      {/* Calves */}
      <path id="calf-l" d="M37,230 L55,230 L53,272 L39,272 Z" fill={gc('calf-l')} stroke="none"/>
      <path id="calf-r" d="M65,230 L83,230 L81,272 L67,272 Z" fill={gc('calf-r')} stroke="none"/>
    </svg>
  )
}

function BackSVG({ gc }) {
  const bg = 'var(--bg3)'
  const bd = 'var(--border2)'

  return (
    <svg viewBox="0 0 120 310" className={styles.svg} xmlns="http://www.w3.org/2000/svg">
      {/* ── Body silhouette (same structure, back view) ── */}
      <ellipse cx="60" cy="20" rx="16" ry="18" fill={bg} stroke={bd} strokeWidth="1"/>
      <path d="M53,36 L67,36 L65,50 L55,50 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="30" cy="65" rx="14" ry="13" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="90" cy="65" rx="14" ry="13" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M38,52 L82,52 L88,64 L92,90 L88,130 L80,145 L40,145 L32,130 L28,90 L32,64 Z"
        fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M20,60 L32,58 L34,108 L20,112 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M100,60 L88,58 L86,108 L100,112 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M18,112 L32,110 L30,148 L17,145 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M102,112 L88,110 L90,148 L103,145 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="23" cy="154" rx="7" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="97" cy="154" rx="7" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M32,130 L88,130 L92,148 L82,155 L38,155 L28,148 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M38,155 L58,155 L56,220 L36,218 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M62,155 L82,155 L84,218 L64,220 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="46" cy="222" rx="12" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="74" cy="222" rx="12" ry="8" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M36,228 L56,228 L54,276 L38,276 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <path d="M64,228 L84,228 L82,276 L66,276 Z" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="44" cy="282" rx="12" ry="6" fill={bg} stroke={bd} strokeWidth="0.8"/>
      <ellipse cx="76" cy="282" rx="12" ry="6" fill={bg} stroke={bd} strokeWidth="0.8"/>

      {/* ── Back muscle overlays ── */}
      {/* Traps */}
      <path id="trap-l" d="M55,38 L38,52 L30,60 L32,72 L55,62 Z" fill={gc('trap-l')} stroke="none"/>
      <path id="trap-r" d="M65,38 L82,52 L90,60 L88,72 L65,62 Z" fill={gc('trap-r')} stroke="none"/>
      {/* Rear delts */}
      <ellipse id="rear-delt-l" cx="30" cy="65" rx="12" ry="11" fill={gc('rear-delt-l')} stroke="none"/>
      <ellipse id="rear-delt-r" cx="90" cy="65" rx="12" ry="11" fill={gc('rear-delt-r')} stroke="none"/>
      {/* Rhomboids (between shoulder blades) */}
      <path id="rhomboid-l" d="M40,62 L58,60 L57,88 L40,90 Z" fill={gc('rhomboid-l')} stroke="none"/>
      <path id="rhomboid-r" d="M80,62 L62,60 L63,88 L80,90 Z" fill={gc('rhomboid-r')} stroke="none"/>
      {/* Lats */}
      <path id="lat-l" d="M30,72 L42,68 L44,110 L30,118 Z" fill={gc('lat-l')} stroke="none"/>
      <path id="lat-r" d="M90,72 L78,68 L76,110 L90,118 Z" fill={gc('lat-r')} stroke="none"/>
      {/* Lower back / erectors */}
      <path id="lower-back" d="M44,90 L76,90 L76,130 L44,130 Z" fill={gc('lower-back')} stroke="none"/>
      {/* Triceps */}
      <path id="tricep-l" d="M20,62 L30,60 L32,105 L20,108 Z" fill={gc('tricep-l')} stroke="none"/>
      <path id="tricep-r" d="M100,62 L90,60 L88,105 L100,108 Z" fill={gc('tricep-r')} stroke="none"/>
      {/* Glutes */}
      <path id="glute-l" d="M32,132 L58,130 L57,158 L30,160 Z" fill={gc('glute-l')} stroke="none"/>
      <path id="glute-r" d="M88,132 L62,130 L63,158 L90,160 Z" fill={gc('glute-r')} stroke="none"/>
      {/* Hamstrings */}
      <path id="ham-l" d="M36,158 L57,158 L55,220 L34,218 Z" fill={gc('ham-l')} stroke="none"/>
      <path id="ham-r" d="M84,158 L63,158 L65,220 L86,218 Z" fill={gc('ham-r')} stroke="none"/>
      {/* Calves back */}
      <path id="calf-l-b" d="M37,230 L55,230 L53,272 L39,272 Z" fill={gc('calf-l')} stroke="none"/>
      <path id="calf-r-b" d="M65,230 L83,230 L81,272 L67,272 Z" fill={gc('calf-r')} stroke="none"/>
    </svg>
  )
}

export default function BodyMap({ muscles, dayColor }) {
  const { primary, secondary } = buildSets(muscles)

  const gc = (id) => {
    if (primary.has(id)) return `${dayColor}CC`
    if (secondary.has(id)) return `${dayColor}44`
    return 'transparent'
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.figure}>
        <FrontSVG gc={gc} />
        <span className={styles.label}>Front</span>
      </div>
      <div className={styles.figure}>
        <BackSVG gc={gc} />
        <span className={styles.label}>Back</span>
      </div>
    </div>
  )
}
