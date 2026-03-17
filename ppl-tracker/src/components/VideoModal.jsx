import BodyMap from './BodyMap'
import styles from './VideoModal.module.css'

export default function VideoModal({ exercise, dayColor, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div className={styles.name}>{exercise.name}</div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {/* Video */}
        {exercise.video?.type === 'mp4' ? (
          <div className={styles.videoWrap}>
            <video autoPlay loop muted playsInline controls className={styles.video}>
              <source src={exercise.video.url} type="video/mp4" />
            </video>
          </div>
        ) : (
          <div className={styles.noVideo}>No demo video yet for this exercise</div>
        )}

        {/* Muscle tags */}
        <div className={styles.muscles}>
          {exercise.muscles?.primary?.map(m => (
            <span key={m} className={styles.primary}
              style={{ background: `${dayColor}18`, color: dayColor, borderColor: `${dayColor}40` }}>
              {m}
            </span>
          ))}
          {exercise.muscles?.secondary?.map(m => (
            <span key={m} className={styles.secondary}>{m}</span>
          ))}
        </div>

        {/* Body map */}
        {exercise.muscles && (
          <div className={styles.mapSection}>
            <div className={styles.mapLabel}>Muscles targeted</div>
            <BodyMap muscles={exercise.muscles} dayColor={dayColor || '#F59E0B'} />
          </div>
        )}

      </div>
    </div>
  )
}
