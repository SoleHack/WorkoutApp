import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrograms, useWorkouts, useProgramEditor, useWorkoutEditor, useExerciseLibrary } from '../hooks/usePrograms'
import { useActiveProgram } from '../hooks/useActiveProgram.jsx'
import { supabase } from '../lib/supabase'
import { useDragReorder } from '../hooks/useDragReorder'
import styles from './Programs.module.css'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_TYPES = [
  { value: 'push',   label: 'Push',   color: '#F59E0B' },
  { value: 'pull',   label: 'Pull',   color: '#38BDF8' },
  { value: 'legs',   label: 'Legs',   color: '#4ADE80' },
  { value: 'upper',  label: 'Upper',  color: '#A78BFA' },
  { value: 'lower',  label: 'Lower',  color: '#FB923C' },
  { value: 'full',   label: 'Full',   color: '#F472B6' },
  { value: 'core',   label: 'Core',   color: '#E2D9C8' },
  { value: 'custom', label: 'Custom', color: '#6B7280' },
]
const TAG_OPTIONS = ['compound','iso','rehab','stability','hold','optional']

// ── View router ───────────────────────────────────────────────
export default function Programs() {
  const [view, setView] = useState('list')          // 'list' | 'program' | 'workout'
  const [selectedProgramId, setSelectedProgramId] = useState(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null)

  const openProgram = (id) => { setSelectedProgramId(id); setView('program') }
  const openWorkout = (id) => { setSelectedWorkoutId(id); setView('workout') }
  const goBack = () => {
    if (view === 'workout') { setView('program'); setSelectedWorkoutId(null) }
    else { setView('list'); setSelectedProgramId(null) }
  }

  if (view === 'workout') return <WorkoutEditorView workoutId={selectedWorkoutId} onBack={goBack} onOpenWorkout={openWorkout} />
  if (view === 'program') return <ProgramEditorView programId={selectedProgramId} onBack={goBack} onOpenWorkout={openWorkout} />
  return <ProgramsListView onOpenProgram={openProgram} />
}

// ── Programs list ─────────────────────────────────────────────
function ProgramsListView({ onOpenProgram }) {
  const { programs, activeId, loading, createProgram, deleteProgram, activateProgram, cloneProgram } = usePrograms()
  const { reload } = useActiveProgram()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [cloning, setCloning] = useState(null)
  const [cloneName, setCloneName] = useState('')
  const [confirm, setConfirm] = useState(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const prog = await createProgram(newName.trim())
    setNewName(''); setCreating(false)
    onOpenProgram(prog.id)
  }

  const handleActivate = async (id) => {
    await activateProgram(id)
    reload()
  }

  const handleClone = async () => {
    if (!cloneName.trim()) return
    const prog = await cloneProgram(cloning, cloneName.trim())
    setCloning(null); setCloneName('')
    onOpenProgram(prog.id)
  }

  const handleDelete = async (id) => {
    await deleteProgram(id)
    setConfirm(null)
  }

  if (loading) return <PageShell title="Programs"><Loader /></PageShell>

  return (
    <PageShell title="Programs" sub="Manage your workouts and programs">
      {/* Active program banner */}
      {activeId && (
        <div className={styles.activeBanner}>
          <span className={styles.activeDot} />
          Active: <strong>{programs.find(p => p.id === activeId)?.name || '—'}</strong>
        </div>
      )}

      {/* Program cards */}
      <div className={styles.cardList}>
        {programs.map(p => (
          <div key={p.id} className={`${styles.programCard} ${p.id === activeId ? styles.programCardActive : ''}`}>
            <div className={styles.programCardMain} onClick={() => onOpenProgram(p.id)}>
              <div className={styles.programCardName}>{p.name}</div>
              <div className={styles.programCardMeta}>
                {p.split_type} {p.is_default ? '· Default' : ''}
                {p.description ? ` · ${p.description.slice(0, 40)}` : ''}
              </div>
            </div>
            <div className={styles.programCardActions}>
              {p.id !== activeId && (
                <button className={styles.actionChip} onClick={() => handleActivate(p.id)}>
                  Set active
                </button>
              )}
              {p.id === activeId && (
                <span className={styles.activeChip}>✓ Active</span>
              )}
              <button className={styles.actionChip} onClick={() => { setCloning(p.id); setCloneName(`${p.name} (copy)`) }}>
                Clone
              </button>
              {!p.is_default && (
                <button className={`${styles.actionChip} ${styles.actionChipDanger}`} onClick={() => setConfirm(p.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create new */}
      {creating ? (
        <div className={styles.createForm}>
          <input className={styles.createInput} autoFocus placeholder="Program name"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }} />
          <div className={styles.createBtns}>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>Create</button>
            <button className="btn" onClick={() => { setCreating(false); setNewName('') }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className={`btn ${styles.createBtn}`} onClick={() => setCreating(true)}>
          + New Program
        </button>
      )}

      {/* Clone modal */}
      {cloning && (
        <Modal title="Clone Program" onClose={() => setCloning(null)}>
          <p className={styles.modalDesc}>Create a copy you can customize independently.</p>
          <input className={styles.createInput} autoFocus placeholder="New program name"
            value={cloneName} onChange={e => setCloneName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleClone()} />
          <div className={styles.createBtns}>
            <button className="btn btn-primary" onClick={handleClone} disabled={!cloneName.trim()}>Clone</button>
            <button className="btn" onClick={() => setCloning(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirm && (
        <Modal title="Delete Program?" onClose={() => setConfirm(null)}>
          <p className={styles.modalDesc}>This permanently deletes the program and its schedule. Workouts and history are not affected.</p>
          <div className={styles.createBtns}>
            <button className="btn btn-danger" onClick={() => handleDelete(confirm)}>Delete</button>
            <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ── Program editor ────────────────────────────────────────────
function ProgramEditorView({ programId, onBack, onOpenWorkout }) {
  const { program, days, loading, assignWorkout, setRestDay, updateProgram } = useProgramEditor(programId)
  const { workouts, load: reloadWorkouts, createWorkout, cloneWorkout } = useWorkouts()
  const { programs, activeId, activateProgram, cloneProgram } = usePrograms()
  const { reload: reloadActive, morningWorkoutId } = useActiveProgram()
  const [editName, setEditName] = useState(false)
  const [name, setName] = useState('')
  const [dayPicker, setDayPicker] = useState(null)
  const [morningPicker, setMorningPicker] = useState(false)
  const [creatingWorkout, setCreatingWorkout] = useState(false)
  const [newWorkoutName, setNewWorkoutName] = useState('')
  const [newWorkoutType, setNewWorkoutType] = useState('custom')
  const [cloning, setCloning] = useState(false)

  const isActive = program?.id === activeId
  const isSystem = program && !program.user_id

  const handleCloneProgram = async () => {
    setCloning(true)
    try {
      const cloned = await cloneProgram(programId, program.name)
      // Auto-activate the clone and navigate into it
      await activateProgram(cloned.id)
      reloadActive()
      onBack()
      // Navigate into the clone — parent will handle via list refresh
    } finally {
      setCloning(false)
    }
  }

  const handleSaveName = async () => {
    if (!name.trim()) return
    await updateProgram({ name: name.trim() })
    setEditName(false)
  }

  const handleAssign = async (workoutId) => {
    await assignWorkout(dayPicker, workoutId)
    setDayPicker(null)
  }

  const handleRest = async (dayIndex) => {
    await setRestDay(dayIndex, true)
    setDayPicker(null)
  }

  const handleClearDay = async (dayIndex) => {
    await setRestDay(dayIndex, false)
  }

  const handleSetMorning = async (workoutId) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_programs').upsert({
      user_id: user.id,
      program_id: programId,
      morning_workout_id: workoutId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    reloadActive()
    setMorningPicker(false)
  }

  const handleActivate = async () => {
    await activateProgram(programId, morningWorkoutId)
    reloadActive()
  }

  const handleCreateWorkout = async () => {
    if (!newWorkoutName.trim()) return
    const type = DAY_TYPES.find(t => t.value === newWorkoutType)
    const w = await createWorkout({
      name: newWorkoutName.trim(),
      dayType: newWorkoutType,
      color: type?.color || '#6B7280',
    })
    setCreatingWorkout(false)
    setNewWorkoutName('')
    setNewWorkoutType('custom')
    reloadWorkouts()
    onOpenWorkout(w.id)
  }

  if (loading) return <PageShell title="Program" onBack={onBack}><Loader /></PageShell>

  const morningWorkout = workouts.find(w => w.id === morningWorkoutId)

  return (
    <PageShell
      title={program?.name || 'Program'}
      sub={program?.split_type}
      onBack={onBack}
      actions={
        <button
          className={`${styles.activateBtn} ${isActive ? styles.activateBtnActive : ''}`}
          onClick={handleActivate}>
          {isActive ? '✓ Active' : 'Set Active'}
        </button>
      }
    >
      {/* System program guard */}
      {isSystem && (
        <div className={styles.systemBanner}>
          <div className={styles.systemBannerIcon}>🔒</div>
          <div className={styles.systemBannerText}>
            <div className={styles.systemBannerTitle}>System Program</div>
            <div className={styles.systemBannerDesc}>
              This is a default program and can't be edited directly. Clone it to create your own editable version with all the same workouts and schedule.
            </div>
          </div>
          <button className={`btn btn-primary ${styles.cloneBtn}`}
            onClick={handleCloneProgram} disabled={cloning}>
            {cloning ? '...' : 'Clone to Edit'}
          </button>
        </div>
      )}

      {/* Rename — only for user-owned programs */}
      {!isSystem && (editName ? (
        <div className={styles.nameEdit}>
          <input className={styles.createInput} autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditName(false) }} />
          <div className={styles.createBtns}>
            <button className="btn btn-primary" onClick={handleSaveName}>Save</button>
            <button className="btn" onClick={() => setEditName(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className={styles.editNameBtn} onClick={() => { setEditName(true); setName(program?.name || '') }}>
          ✎ Rename program
        </button>
      ))}

      {/* Weekly schedule */}
      <div className={styles.schedSection}>
        <div className={styles.schedTitle}>Weekly Schedule</div>
        <div className={styles.schedGrid}>
          {DAY_NAMES.map((dayName, i) => {
            const slot = days.find(d => d.day_index === i)
            const assigned = slot?.workout
            const isRest = slot?.is_rest
            return (
              <div key={i} className={styles.schedDay}>
                <div className={styles.schedDayName}>{dayName}</div>
                {assigned ? (
                  <div className={styles.schedAssigned}
                    style={{ borderColor: assigned.color, color: assigned.color }}>
                    <span className={styles.schedAssignedName}
                      onClick={() => !isSystem && setDayPicker(i)}
                      style={isSystem ? { cursor: 'default' } : {}}>
                      {assigned.name}
                    </span>
                    {!isSystem && <button className={styles.schedEdit} onClick={() => onOpenWorkout(assigned.id)} title="Edit workout">✎</button>}
                    {!isSystem && <button className={styles.schedClear} onClick={() => handleClearDay(i)} title="Remove">✕</button>}
                  </div>
                ) : isRest ? (
                  <div className={styles.schedRest}>
                    <span>Rest</span>
                    {!isSystem && <button className={styles.schedClear} onClick={() => handleClearDay(i)}>✕</button>}
                  </div>
                ) : !isSystem ? (
                  <button className={styles.schedEmpty} onClick={() => setDayPicker(i)}>
                    + Assign
                  </button>
                ) : (
                  <div className={styles.schedEmpty} style={{ cursor: 'default', opacity: 0.4 }}>Empty</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Morning routine */}
      <div className={styles.morningSection}>
        <div className={styles.schedTitle}>Morning Routine</div>
        <div className={styles.morningCard}
          onClick={() => !isSystem && setMorningPicker(true)}
          style={isSystem ? { cursor: 'default' } : {}}>
          {morningWorkout ? (
            <>
              <div className={styles.morningName}>{morningWorkout.name}</div>
              <div className={styles.morningChange}>Tap to change →</div>
            </>
          ) : (
            <div className={styles.morningEmpty}>+ Set morning routine</div>
          )}
        </div>
      </div>

      {/* Workouts library */}
      <div className={styles.workoutsSection}>
        <div className={styles.schedTitle}>My Workouts</div>
        <div className={styles.workoutsList}>
          {workouts.map(w => (
            <div key={w.id} className={styles.workoutRow} onClick={() => onOpenWorkout(w.id)}>
              <div className={styles.workoutDot} style={{ background: w.color }} />
              <div className={styles.workoutRowName}>{w.name}</div>
              <div className={styles.workoutRowMeta}>{w.focus || w.day_type}</div>
              <span className={styles.workoutRowArrow}>→</span>
            </div>
          ))}
          {creatingWorkout ? (
            <div className={styles.createForm}>
              <input className={styles.createInput} autoFocus placeholder="Workout name"
                value={newWorkoutName} onChange={e => setNewWorkoutName(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setCreatingWorkout(false)} />
              <div className={styles.typeRow}>
                {DAY_TYPES.map(t => (
                  <button key={t.value}
                    className={`${styles.typeChip} ${newWorkoutType === t.value ? styles.typeChipActive : ''}`}
                    style={newWorkoutType === t.value ? { borderColor: t.color, color: t.color } : {}}
                    onClick={() => setNewWorkoutType(t.value)}>{t.label}</button>
                ))}
              </div>
              <div className={styles.createBtns}>
                <button className="btn btn-primary" onClick={handleCreateWorkout} disabled={!newWorkoutName.trim()}>Create</button>
                <button className="btn" onClick={() => { setCreatingWorkout(false); setNewWorkoutName('') }}>Cancel</button>
              </div>
            </div>
          ) : !isSystem ? (
            <button className={`btn ${styles.createBtn}`} onClick={() => setCreatingWorkout(true)}>
              + New Workout
            </button>
          ) : null}
        </div>
      </div>

      {/* Day picker modal */}
      {dayPicker !== null && (
        <Modal title={`Assign ${DAY_NAMES[dayPicker]}`} onClose={() => setDayPicker(null)}>
          <div className={styles.pickerList}>
            {workouts.map(w => (
              <button key={w.id} className={styles.pickerRow} onClick={() => handleAssign(w.id)}>
                <div className={styles.workoutDot} style={{ background: w.color }} />
                <div>
                  <div className={styles.pickerName}>{w.name}</div>
                  <div className={styles.pickerMeta}>{w.focus || w.day_type}</div>
                </div>
              </button>
            ))}
            <button className={`${styles.pickerRow} ${styles.pickerRest}`} onClick={() => handleRest(dayPicker)}>
              😴 Rest Day
            </button>
          </div>
        </Modal>
      )}

      {/* Morning picker modal */}
      {morningPicker && (
        <Modal title="Morning Routine" onClose={() => setMorningPicker(false)}>
          <p className={styles.modalDesc}>Runs daily alongside your scheduled workout.</p>
          <div className={styles.pickerList}>
            {workouts.map(w => (
              <button key={w.id} className={styles.pickerRow} onClick={() => handleSetMorning(w.id)}>
                <div className={styles.workoutDot} style={{ background: w.color }} />
                <div>
                  <div className={styles.pickerName}>{w.name}</div>
                  <div className={styles.pickerMeta}>{w.focus || w.day_type}</div>
                </div>
              </button>
            ))}
            <button className={`${styles.pickerRow} ${styles.pickerRest}`} onClick={() => handleSetMorning(null)}>
              None
            </button>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ── Workout editor ────────────────────────────────────────────
function WorkoutEditorView({ workoutId, onBack, onOpenWorkout }) {
  const { workout, exercises, loading, addExercise, updateExercise, removeExercise, reorderExercises, updateWorkout } = useWorkoutEditor(workoutId)
  const { cloneWorkout } = useWorkouts()
  const [showPicker, setShowPicker] = useState(false)
  const [editingEx, setEditingEx] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [editName, setEditName] = useState(false)
  const [name, setName] = useState('')
  const [cloning, setCloning] = useState(false)

  const { containerProps, handleProps, itemProps, draggingIndex } = useDragReorder(
    exercises,
    (fromIdx, toIdx) => reorderExercises(fromIdx, toIdx)
  )

  const isSystem = workout && !workout.user_id

  const handleSaveName = async () => {
    if (!name.trim()) return
    await updateWorkout({ name: name.trim() })
    setEditName(false)
  }

  const handleCloneToEdit = async () => {
    setCloning(true)
    try {
      const cloned = await cloneWorkout(workoutId, workout.name)
      if (onOpenWorkout) onOpenWorkout(cloned.id)
    } finally {
      setCloning(false)
    }
  }

  const handleAddExercise = async (ex) => {
    const type = ex.tags?.[0] || 'iso'
    const tag = type.includes('compound') ? 'compound'
      : type.includes('rehab') ? 'rehab'
      : type.includes('stability') ? 'stability'
      : type.includes('hold') ? 'hold' : 'iso'
    await addExercise(ex.id, {
      sets: tag === 'compound' ? 4 : 3,
      reps: tag === 'compound' ? '8-10' : '12-15',
      rest_seconds: tag === 'compound' ? 150 : 90,
      tag,
    })
    setShowPicker(false)
  }

  if (loading) return <PageShell title="Workout" onBack={onBack}><Loader /></PageShell>

  return (
    <PageShell title={workout?.name || 'Workout'} onBack={onBack}>

      {/* System workout guard */}
      {isSystem && (
        <div className={styles.systemBanner}>
          <div className={styles.systemBannerIcon}>🔒</div>
          <div className={styles.systemBannerText}>
            <div className={styles.systemBannerTitle}>System Workout</div>
            <div className={styles.systemBannerDesc}>
              This workout is part of the default program and can't be edited directly.
              Clone it to create your own editable version.
            </div>
          </div>
          <button className={`btn btn-primary ${styles.cloneBtn}`}
            onClick={handleCloneToEdit} disabled={cloning}>
            {cloning ? '...' : 'Clone to Edit'}
          </button>
        </div>
      )}

      {/* Rename — only for user-owned workouts */}
      {!isSystem && (editName ? (
        <div className={styles.nameEdit}>
          <input className={styles.createInput} autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditName(false) }} />
          <div className={styles.createBtns}>
            <button className="btn btn-primary" onClick={handleSaveName}>Save</button>
            <button className="btn" onClick={() => setEditName(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className={styles.editNameBtn} onClick={() => { setEditName(true); setName(workout?.name || '') }}>
          ✎ Rename workout
        </button>
      ))}

      {/* Exercise list */}
      <div className={styles.exList} {...(!isSystem ? containerProps : {})}>
        {exercises.map((ex, idx) => (
          <div key={ex.id} className={styles.exRow} {...(!isSystem ? itemProps(idx) : {})}>
            {/* Horizontal row: handle | info | delete */}
            <div className={styles.exRowTop}>
              {!isSystem && (
                <div className={styles.exDragArea} {...handleProps(idx)}>
                  <span className={styles.dragHandle}>⠿</span>
                </div>
              )}

              <div className={styles.exInfo} onClick={() => !isSystem && setEditingEx(editingEx?.id === ex.id ? null : ex)}>
                <div className={styles.exName}>{ex.exercise?.name || 'Unknown'}</div>
                <div className={styles.exParams}>
                  {ex.sets}×{ex.reps} · {ex.rest_seconds}s rest · <span className={styles.exTag}>{ex.tag}</span>
                </div>
                {ex.notes && <div className={styles.exNote}>{ex.notes}</div>}
              </div>

              {!isSystem && (
                <button className={styles.exDelete} onClick={() => setConfirm(ex.id)}>✕</button>
              )}
            </div>

            {/* Inline editor — expands below the row */}
            {!isSystem && editingEx?.id === ex.id && (
              <div className={styles.exEditor}>
                <div className={styles.exEditorRow}>
                  <div className={styles.exEditorField}>
                    <label>Sets</label>
                    <input type="number" min="1" max="10" value={ex.sets}
                      onChange={e => updateExercise(ex.id, { sets: parseInt(e.target.value) })} />
                  </div>
                  <div className={styles.exEditorField}>
                    <label>Reps</label>
                    <input type="text" value={ex.reps}
                      onChange={e => updateExercise(ex.id, { reps: e.target.value })} />
                  </div>
                  <div className={styles.exEditorField}>
                    <label>Rest (s)</label>
                    <input type="number" min="30" max="300" step="15" value={ex.rest_seconds}
                      onChange={e => updateExercise(ex.id, { rest_seconds: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className={styles.tagRow}>
                  {TAG_OPTIONS.map(t => (
                    <button key={t}
                      className={`${styles.typeChip} ${ex.tag === t ? styles.typeChipActive : ''}`}
                      onClick={() => updateExercise(ex.id, { tag: t })}>{t}</button>
                  ))}
                </div>
                <input className={styles.notesInput} placeholder="Coaching note (optional)"
                  value={ex.notes || ''}
                  onChange={e => updateExercise(ex.id, { notes: e.target.value || null })} />
              </div>
            )}
          </div>
        ))}

        {/* Add exercise — only for user workouts */}
        {!isSystem && (
          <button className={`btn ${styles.createBtn}`} onClick={() => setShowPicker(true)}>
            + Add Exercise
          </button>
        )}
      </div>

      {/* Exercise picker */}
      {showPicker && (
        <ExercisePicker onAdd={handleAddExercise} onClose={() => setShowPicker(false)}
          existingSlugs={exercises.map(e => e.exercise?.slug).filter(Boolean)} />
      )}

      {/* Delete confirm */}
      {confirm && (
        <Modal title="Remove Exercise?" onClose={() => setConfirm(null)}>
          <p className={styles.modalDesc}>This removes the exercise from this workout only. History is not affected.</p>
          <div className={styles.createBtns}>
            <button className="btn btn-danger" onClick={() => { removeExercise(confirm); setConfirm(null) }}>Remove</button>
            <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ── Exercise picker ───────────────────────────────────────────
function ExercisePicker({ onAdd, onClose, existingSlugs = [] }) {
  const { exercises, loading } = useExerciseLibrary()
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState(null)

  const allMuscles = [...new Set(exercises.flatMap(e => e.muscles || []))].sort()

  const filtered = exercises.filter(ex => {
    if (existingSlugs.includes(ex.slug)) return false
    if (muscleFilter && !ex.muscles?.includes(muscleFilter)) return false
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Modal title="Add Exercise" onClose={onClose} fullHeight>
      <div className={styles.pickerSearch}>
        <input className={styles.searchInput} autoFocus placeholder="Search exercises…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className={styles.muscleFilters}>
        <button className={`${styles.muscleChip} ${!muscleFilter ? styles.muscleChipActive : ''}`}
          onClick={() => setMuscleFilter(null)}>All</button>
        {allMuscles.map(m => (
          <button key={m}
            className={`${styles.muscleChip} ${muscleFilter === m ? styles.muscleChipActive : ''}`}
            onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}>{m}</button>
        ))}
      </div>
      {loading ? <Loader /> : (
        <div className={styles.pickerList}>
          {filtered.length === 0 && (
            <div className={styles.emptyMsg}>No exercises match your search.</div>
          )}
          {filtered.map(ex => (
            <button key={ex.id} className={styles.pickerRow} onClick={() => onAdd(ex)}>
              <div>
                <div className={styles.pickerName}>{ex.name}</div>
                <div className={styles.pickerMeta}>{ex.muscles?.join(' · ')}</div>
              </div>
              <span className={styles.addChip}>+ Add</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Shared components ─────────────────────────────────────────
function PageShell({ title, sub, onBack, actions, children }) {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          {onBack && <button className={styles.back} onClick={onBack}>← Back</button>}
          <div className={styles.headerTitle}>{title}</div>
          {actions && <div className={styles.headerActions}>{actions}</div>}
        </div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}

function Modal({ title, onClose, children, fullHeight = false }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${fullHeight ? styles.modalFull : ''}`}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{title}</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}

function Loader() {
  return <div className={styles.loader}>LOADING...</div>
}
