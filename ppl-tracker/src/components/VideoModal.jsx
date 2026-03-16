import styles from './VideoModal.module.css'

export default function VideoModal({ exercise, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.name}>{exercise.name}</div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {exercise.video?.type === 'mp4' && (
          <div className={styles.videoWrap}>
            <video autoPlay loop muted playsInline controls className={styles.video}>
              <source src={exercise.video.url} type="video/mp4" />
            </video>
          </div>
        )}

        <div className={styles.muscles}>
          {exercise.muscles.primary.map(m => (
            <span key={m} className={styles.primary}>{m}</span>
          ))}
          {exercise.muscles.secondary.map(m => (
            <span key={m} className={styles.secondary}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
