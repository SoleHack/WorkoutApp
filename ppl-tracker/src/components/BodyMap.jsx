import styles from './BodyMap.module.css'

// Maps muscle names from program.js to SVG group IDs
const MUSCLE_TO_IDS = {
  'Upper Chest':      ['chest-upper'],
  'Lower Chest':      ['chest-lower'],
  'Front Deltoid':    ['delt-front-l', 'delt-front-r'],
  'Lateral Deltoid':  ['delt-side-l', 'delt-side-r'],
  'Rear Deltoid':     ['delt-rear-l', 'delt-rear-r'],
  'Triceps':          ['tricep-l', 'tricep-r'],
  'Biceps':           ['bicep-l', 'bicep-r'],
  'Latissimus Dorsi': ['lat-l', 'lat-r'],
  'Rhomboids':        ['rhomboid-l', 'rhomboid-r'],
  'Trapezius':        ['trap-l', 'trap-r'],
  'Quadriceps':       ['quad-l', 'quad-r'],
  'Hamstrings':       ['ham-l', 'ham-r'],
  'Glutes':           ['glute-l', 'glute-r'],
  'Calves':           ['calf-l', 'calf-r'],
  'Core / Abs':       ['abs'],
  'Lower Back':       ['lower-back-l', 'lower-back-r'],
  'Hip Flexors':      ['hip-l', 'hip-r'],
}

function getHighlighted(muscles) {
  const primary = new Set()
  const secondary = new Set()
  muscles?.primary?.forEach(m => MUSCLE_TO_IDS[m]?.forEach(id => primary.add(id)))
  muscles?.secondary?.forEach(m => MUSCLE_TO_IDS[m]?.forEach(id => secondary.add(id)))
  // Primary takes precedence
  secondary.forEach(id => { if (primary.has(id)) secondary.delete(id) })
  return { primary, secondary }
}

export default function BodyMap({ muscles, dayColor }) {
  const { primary, secondary } = getHighlighted(muscles)

  const fill = (id) => {
    if (primary.has(id)) return dayColor
    if (secondary.has(id)) return `${dayColor}55`
    return 'var(--bg3)'
  }

  const stroke = (id) => {
    if (primary.has(id)) return dayColor
    if (secondary.has(id)) return `${dayColor}88`
    return 'var(--border2)'
  }

  return (
    <div className={styles.wrap}>
      {/* FRONT */}
      <div className={styles.figure}>
        <svg viewBox="0 0 100 220" className={styles.svg} xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="50" cy="14" rx="10" ry="12" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
          {/* Neck */}
          <rect x="46" y="24" width="8" height="6" rx="2" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
          {/* Traps front */}
          <path id="trap-l" d="M50 30 L32 38 L36 44 L50 36Z" fill={fill('trap-l')} stroke={stroke('trap-l')} strokeWidth="0.8"/>
          <path id="trap-r" d="M50 30 L68 38 L64 44 L50 36Z" fill={fill('trap-r')} stroke={stroke('trap-r')} strokeWidth="0.8"/>
          {/* Front delts */}
          <ellipse id="delt-front-l" cx="30" cy="44" rx="7" ry="8" fill={fill('delt-front-l')} stroke={stroke('delt-front-l')} strokeWidth="0.8"/>
          <ellipse id="delt-front-r" cx="70" cy="44" rx="7" ry="8" fill={fill('delt-front-r')} stroke={stroke('delt-front-r')} strokeWidth="0.8"/>
          {/* Side delts */}
          <ellipse id="delt-side-l" cx="24" cy="50" rx="5" ry="6" fill={fill('delt-side-l')} stroke={stroke('delt-side-l')} strokeWidth="0.8"/>
          <ellipse id="delt-side-r" cx="76" cy="50" rx="5" ry="6" fill={fill('delt-side-r')} stroke={stroke('delt-side-r')} strokeWidth="0.8"/>
          {/* Upper chest */}
          <path id="chest-upper" d="M36 38 Q50 34 64 38 L64 52 Q50 48 36 52Z" fill={fill('chest-upper')} stroke={stroke('chest-upper')} strokeWidth="0.8"/>
          {/* Lower chest */}
          <path id="chest-lower" d="M36 52 Q50 48 64 52 L62 62 Q50 58 38 62Z" fill={fill('chest-lower')} stroke={stroke('chest-lower')} strokeWidth="0.8"/>
          {/* Biceps */}
          <ellipse id="bicep-l" cx="21" cy="64" rx="5" ry="10" fill={fill('bicep-l')} stroke={stroke('bicep-l')} strokeWidth="0.8"/>
          <ellipse id="bicep-r" cx="79" cy="64" rx="5" ry="10" fill={fill('bicep-r')} stroke={stroke('bicep-r')} strokeWidth="0.8"/>
          {/* Triceps front visible */}
          <ellipse id="tricep-l" cx="19" cy="66" rx="3" ry="9" fill={fill('tricep-l')} stroke={stroke('tricep-l')} strokeWidth="0.8"/>
          <ellipse id="tricep-r" cx="81" cy="66" rx="3" ry="9" fill={fill('tricep-r')} stroke={stroke('tricep-r')} strokeWidth="0.8"/>
          {/* Abs */}
          <path id="abs" d="M38 62 Q50 58 62 62 L62 100 Q50 96 38 100Z" fill={fill('abs')} stroke={stroke('abs')} strokeWidth="0.8"/>
          {/* Abs grid lines */}
          {fill('abs') !== 'var(--bg3)' && <>
            <line x1="50" y1="62" x2="50" y2="100" stroke="var(--bg2)" strokeWidth="0.8"/>
            <line x1="38" y1="74" x2="62" y2="74" stroke="var(--bg2)" strokeWidth="0.8"/>
            <line x1="38" y1="86" x2="62" y2="86" stroke="var(--bg2)" strokeWidth="0.8"/>
          </>}
          {/* Forearms */}
          <ellipse cx="19" cy="85" rx="4" ry="10" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          <ellipse cx="81" cy="85" rx="4" ry="10" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          {/* Hip flexors */}
          <path id="hip-l" d="M38 100 L50 100 L50 114 L36 112Z" fill={fill('hip-l')} stroke={stroke('hip-l')} strokeWidth="0.8"/>
          <path id="hip-r" d="M62 100 L50 100 L50 114 L64 112Z" fill={fill('hip-r')} stroke={stroke('hip-r')} strokeWidth="0.8"/>
          {/* Quads */}
          <path id="quad-l" d="M36 112 L50 114 L48 158 L34 154Z" fill={fill('quad-l')} stroke={stroke('quad-l')} strokeWidth="0.8"/>
          <path id="quad-r" d="M64 112 L50 114 L52 158 L66 154Z" fill={fill('quad-r')} stroke={stroke('quad-r')} strokeWidth="0.8"/>
          {/* Calves front */}
          <ellipse id="calf-l" cx="39" cy="180" rx="7" ry="14" fill={fill('calf-l')} stroke={stroke('calf-l')} strokeWidth="0.8"/>
          <ellipse id="calf-r" cx="61" cy="180" rx="7" ry="14" fill={fill('calf-r')} stroke={stroke('calf-r')} strokeWidth="0.8"/>
          {/* Knees */}
          <ellipse cx="39" cy="162" rx="7" ry="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          <ellipse cx="61" cy="162" rx="7" ry="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          {/* Feet */}
          <ellipse cx="39" cy="208" rx="8" ry="5" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          <ellipse cx="61" cy="208" rx="8" ry="5" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
        </svg>
        <div className={styles.label}>Front</div>
      </div>

      {/* BACK */}
      <div className={styles.figure}>
        <svg viewBox="0 0 100 220" className={styles.svg} xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="50" cy="14" rx="10" ry="12" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
          {/* Neck */}
          <rect x="46" y="24" width="8" height="6" rx="2" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
          {/* Traps */}
          <path id="trap-l-b" d="M50 28 L32 38 L38 46 L50 36Z" fill={fill('trap-l')} stroke={stroke('trap-l')} strokeWidth="0.8"/>
          <path id="trap-r-b" d="M50 28 L68 38 L62 46 L50 36Z" fill={fill('trap-r')} stroke={stroke('trap-r')} strokeWidth="0.8"/>
          {/* Rear delts */}
          <ellipse id="delt-rear-l-b" cx="29" cy="44" rx="7" ry="8" fill={fill('delt-rear-l')} stroke={stroke('delt-rear-l')} strokeWidth="0.8"/>
          <ellipse id="delt-rear-r-b" cx="71" cy="44" rx="7" ry="8" fill={fill('delt-rear-r')} stroke={stroke('delt-rear-r')} strokeWidth="0.8"/>
          {/* Rhomboids */}
          <path id="rhomboid-l-b" d="M38 40 L50 36 L50 56 L38 56Z" fill={fill('rhomboid-l')} stroke={stroke('rhomboid-l')} strokeWidth="0.8"/>
          <path id="rhomboid-r-b" d="M62 40 L50 36 L50 56 L62 56Z" fill={fill('rhomboid-r')} stroke={stroke('rhomboid-r')} strokeWidth="0.8"/>
          {/* Lats */}
          <path id="lat-l-b" d="M24 50 L38 48 L38 80 L26 72Z" fill={fill('lat-l')} stroke={stroke('lat-l')} strokeWidth="0.8"/>
          <path id="lat-r-b" d="M76 50 L62 48 L62 80 L74 72Z" fill={fill('lat-r')} stroke={stroke('lat-r')} strokeWidth="0.8"/>
          {/* Triceps back */}
          <ellipse id="tricep-l-b" cx="20" cy="64" rx="5" ry="11" fill={fill('tricep-l')} stroke={stroke('tricep-l')} strokeWidth="0.8"/>
          <ellipse id="tricep-r-b" cx="80" cy="64" rx="5" ry="11" fill={fill('tricep-r')} stroke={stroke('tricep-r')} strokeWidth="0.8"/>
          {/* Lower back */}
          <path id="lower-back-l-b" d="M38 80 L50 78 L50 102 L38 100Z" fill={fill('lower-back-l')} stroke={stroke('lower-back-l')} strokeWidth="0.8"/>
          <path id="lower-back-r-b" d="M62 80 L50 78 L50 102 L62 100Z" fill={fill('lower-back-r')} stroke={stroke('lower-back-r')} strokeWidth="0.8"/>
          {/* Forearms */}
          <ellipse cx="19" cy="85" rx="4" ry="10" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          <ellipse cx="81" cy="85" rx="4" ry="10" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          {/* Glutes */}
          <path id="glute-l-b" d="M38 100 L50 100 L50 118 L36 116Z" fill={fill('glute-l')} stroke={stroke('glute-l')} strokeWidth="0.8"/>
          <path id="glute-r-b" d="M62 100 L50 100 L50 118 L64 116Z" fill={fill('glute-r')} stroke={stroke('glute-r')} strokeWidth="0.8"/>
          {/* Hamstrings */}
          <path id="ham-l-b" d="M36 116 L50 118 L48 158 L34 154Z" fill={fill('ham-l')} stroke={stroke('ham-l')} strokeWidth="0.8"/>
          <path id="ham-r-b" d="M64 116 L50 118 L52 158 L66 154Z" fill={fill('ham-r')} stroke={stroke('ham-r')} strokeWidth="0.8"/>
          {/* Calves back */}
          <ellipse cx="39" cy="180" rx="7" ry="14" fill={fill('calf-l')} stroke={stroke('calf-l')} strokeWidth="0.8"/>
          <ellipse cx="61" cy="180" rx="7" ry="14" fill={fill('calf-r')} stroke={stroke('calf-r')} strokeWidth="0.8"/>
          {/* Knees */}
          <ellipse cx="39" cy="162" rx="7" ry="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          <ellipse cx="61" cy="162" rx="7" ry="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          {/* Feet */}
          <ellipse cx="39" cy="208" rx="8" ry="5" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
          <ellipse cx="61" cy="208" rx="8" ry="5" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="0.8"/>
        </svg>
        <div className={styles.label}>Back</div>
      </div>
    </div>
  )
}
