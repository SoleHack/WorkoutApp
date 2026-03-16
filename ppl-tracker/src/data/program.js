const BASE = 'https://media.musclewiki.com/media/uploads/videos/branded/'
const mp4 = url => ({ type: 'mp4', url })

export const EXERCISES = {
  // CORE
  'dead-bug':              { name: 'Dead Bug',                         video: mp4(BASE+'male-Bodyweight-dead-bug-side.mp4'),                                      muscles: { primary: ['Core / Abs'], secondary: ['Hip Flexors'] } },
  'bird-dog':              { name: 'Bird Dog',                         video: mp4(BASE+'male-Bodyweight-bird-dog-side.mp4'),                                      muscles: { primary: ['Core / Abs', 'Lower Back'], secondary: ['Glutes'] } },
  'plank':                 { name: 'Plank',                            video: mp4(BASE+'male-bodyweight-hand-plank-side_GnZ2NZh.mp4'),                            muscles: { primary: ['Core / Abs'], secondary: ['Front Deltoid'] } },
  'hollow-body':           { name: 'Hollow Body Hold',                 video: mp4(BASE+'male-Bodyweight-hollow-hold-front.mp4'),                                  muscles: { primary: ['Core / Abs'], secondary: ['Hip Flexors'] } },
  'leg-raise':             { name: 'Lying Leg Raise',                  video: mp4(BASE+'male-Bodyweight-laying-leg-raises-front.mp4'),                            muscles: { primary: ['Core / Abs', 'Hip Flexors'], secondary: [] } },
  'side-plank':            { name: 'Side Plank',                       video: mp4(BASE+'male-bodyweight-hand-side-plank-front.mp4'),                              muscles: { primary: ['Core / Abs'], secondary: ['Glutes'] } },
  // PUSH
  'incline-db-press':      { name: 'Incline DB Press',                 video: mp4(BASE+'male-dumbbell-incline-bench-press-front_q2q0T12.mp4'),                    muscles: { primary: ['Upper Chest'], secondary: ['Front Deltoid', 'Triceps'] } },
  'machine-shoulder-press':{ name: 'Machine Shoulder Press',           video: null,                                                                               muscles: { primary: ['Front Deltoid', 'Lateral Deltoid'], secondary: ['Triceps'] } },
  'cable-chest-fly':       { name: 'Cable Chest Fly',                  video: mp4(BASE+'male-cable-pec-fly-front.mp4'),                                           muscles: { primary: ['Upper Chest', 'Lower Chest'], secondary: ['Front Deltoid'] } },
  'cable-lateral-raise':   { name: 'Cable Lateral Raise',              video: mp4(BASE+'male-Cables-cable-lateral-raise-front.mp4'),                              muscles: { primary: ['Lateral Deltoid'], secondary: [] } },
  'rope-pushdown':         { name: 'Rope Tricep Pushdown',             video: mp4(BASE+'male-Cables-cable-push-down-side.mp4'),                                   muscles: { primary: ['Triceps'], secondary: [] } },
  'overhead-tricep-ext':   { name: 'Overhead Cable Tricep Extension',  video: mp4(BASE+'male-Cables-cable-overhead-tricep-extension-front.mp4'),                  muscles: { primary: ['Triceps'], secondary: [] } },
  'flat-db-press':         { name: 'Flat DB Press',                    video: mp4(BASE+'male-dumbbell-bench-press-front_y8zKZJl.mp4'),                            muscles: { primary: ['Upper Chest', 'Lower Chest'], secondary: ['Front Deltoid', 'Triceps'] } },
  'ez-skull-crusher':      { name: 'EZ Bar Skull Crusher',             video: mp4(BASE+'male-Kettlebells-kettlebell-skull-crusher-side.mp4'),                     muscles: { primary: ['Triceps'], secondary: [] } },
  'pec-deck':              { name: 'Pec Deck / Machine Fly',           video: mp4(BASE+'male-Machine-machine-pec-fly-side.mp4'),                                  muscles: { primary: ['Upper Chest', 'Lower Chest'], secondary: [] } },
  'cable-crossover':       { name: 'Cable Crossover — Low to High',    video: mp4(BASE+'male-Cables-cable-incline-fly-around-side.mp4'),                          muscles: { primary: ['Upper Chest'], secondary: ['Front Deltoid'] } },
  'machine-lateral-raise': { name: 'Machine Lateral Raise',            video: mp4(BASE+'male-Machine-machine-standing-lateral-raise-side.mp4'),                   muscles: { primary: ['Lateral Deltoid'], secondary: [] } },
  'single-arm-pushdown':   { name: 'Single Arm Cable Pushdown',        video: mp4(BASE+'male-Cables-cable-single-arm-pushdown-side.mp4'),                         muscles: { primary: ['Triceps'], secondary: [] } },
  // PULL
  'lat-pulldown-neutral':  { name: 'Lat Pulldown — Neutral Grip',      video: mp4(BASE+'male-Machine-neutral-pulldown-front.mp4'),                                muscles: { primary: ['Latissimus Dorsi'], secondary: ['Biceps', 'Rear Deltoid', 'Rhomboids'] } },
  'seated-cable-row':      { name: 'Seated Cable Row',                 video: mp4(BASE+'male-machine-seated-cable-row-front.mp4'),                                muscles: { primary: ['Latissimus Dorsi', 'Rhomboids'], secondary: ['Biceps', 'Rear Deltoid'] } },
  'chest-supported-row':   { name: 'Chest-Supported DB Row',           video: mp4(BASE+'male-Dumbbells-dumbbell-laying-incline-row-front.mp4'),                   muscles: { primary: ['Rhomboids', 'Latissimus Dorsi'], secondary: ['Biceps', 'Rear Deltoid'] } },
  'face-pulls':            { name: 'Face Pulls',                       video: mp4(BASE+'male-Machine-machine-face-pulls-front.mp4'),                              muscles: { primary: ['Rear Deltoid'], secondary: ['Trapezius', 'Rhomboids'] } },
  'hammer-curls':          { name: 'Hammer Curls',                     video: mp4(BASE+'male-Dumbbells-dumbbell-hammer-curl-front.mp4'),                          muscles: { primary: ['Biceps'], secondary: [] } },
  'cable-curl':            { name: 'Cable Curl',                       video: mp4(BASE+'male-cable-twisting-curl-front.mp4'),                                     muscles: { primary: ['Biceps'], secondary: [] } },
  'wide-lat-pulldown':     { name: 'Wide Grip Lat Pulldown',           video: mp4(BASE+'male-machine-pulldown-front.mp4'),                                        muscles: { primary: ['Latissimus Dorsi'], secondary: ['Biceps', 'Rear Deltoid'] } },
  'single-arm-row':        { name: 'Single Arm DB Row',                video: mp4(BASE+'male-Dumbbells-dumbbell-single-arm-row-front.mp4'),                       muscles: { primary: ['Latissimus Dorsi', 'Rhomboids'], secondary: ['Biceps', 'Rear Deltoid'] } },
  'straight-arm-pulldown': { name: 'Straight Arm Pulldown',            video: mp4(BASE+'male-band-kneeling-single-arm-pulldown-front.mp4'),                       muscles: { primary: ['Latissimus Dorsi'], secondary: [] } },
  'reverse-pec-deck':      { name: 'Reverse Pec Deck — Rear Delt',     video: mp4(BASE+'male-Machine-machine-reverse-fly-front.mp4'),                             muscles: { primary: ['Rear Deltoid'], secondary: ['Rhomboids', 'Trapezius'] } },
  'incline-db-curl':       { name: 'Incline DB Curl',                  video: mp4(BASE+'male-Dumbbells-dumbbell-incline-curl-front.mp4'),                         muscles: { primary: ['Biceps'], secondary: [] } },
  'machine-preacher-curl': { name: 'Machine Preacher Curl',            video: mp4(BASE+'male-Machine-machine-seated-plate-loaded-preacher-curl-side.mp4'),        muscles: { primary: ['Biceps'], secondary: [] } },
  // LEGS
  'belt-squat':            { name: 'Belt Squat',                       video: mp4(BASE+'male-Machine-machine-belt-squat-front.mp4'),                              muscles: { primary: ['Quadriceps', 'Glutes'], secondary: ['Hamstrings'] } },
  'leg-press-high':        { name: 'Leg Press — Standard Foot',        video: null,                                                                               muscles: { primary: ['Quadriceps'], secondary: ['Glutes', 'Hamstrings'] } },
  'leg-extension':         { name: 'Leg Extension',                    video: mp4(BASE+'male-machine-leg-extension-front.mp4'),                                   muscles: { primary: ['Quadriceps'], secondary: [] } },
  'seated-leg-curl':       { name: 'Seated Leg Curl',                  video: mp4(BASE+'male-machine-hamstring-curl-front.mp4'),                                  muscles: { primary: ['Hamstrings'], secondary: [] } },
  'machine-abduction':     { name: 'Machine Hip Abduction',            video: mp4(BASE+'male-Machine-machine-hip-abduction-front.mp4'),                           muscles: { primary: ['Glutes'], secondary: ['Hip Flexors'] } },
  'standing-calf-raise':   { name: 'Standing Calf Raise',              video: mp4(BASE+'male-machine-standing-calf-raises-front.mp4'),                            muscles: { primary: ['Calves'], secondary: [] } },
  'barbell-hip-thrust':    { name: 'Hip Thrust — Barbell',             video: mp4(BASE+'male-Barbell-barbell-hip-thrust-front.mp4'),                              muscles: { primary: ['Glutes'], secondary: ['Hamstrings'] } },
  'rdl-b':                 { name: 'Romanian Deadlift',                video: mp4(BASE+'male-Dumbbells-dumbbell-romanian-deadlift-side.mp4'),                     muscles: { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back'] } },
  'box-step-up':           { name: 'Box Step Up',                      video: mp4(BASE+'male-Dumbbells-dumbbell-step-up-side.mp4'),                               muscles: { primary: ['Glutes', 'Quadriceps'], secondary: ['Hamstrings'] } },
  'lying-leg-curl':        { name: 'Lying Leg Curl',                   video: null,                                                                               muscles: { primary: ['Hamstrings'], secondary: [] } },
  'machine-adduction':     { name: 'Machine Hip Adduction',            video: mp4(BASE+'male-Machine-machine-hip-adduction-front.mp4'),                           muscles: { primary: ['Hip Flexors'], secondary: ['Quadriceps'] } },
  'seated-calf-raise':     { name: 'Seated Calf Raise',                video: mp4(BASE+'male-machine-seated-calf-raise-front.mp4'),                               muscles: { primary: ['Calves'], secondary: [] } },
  // OPTIONAL ADDITIONS
  'cable-pullover':        { name: 'Cable Pullover',                    video: null,                                                                               muscles: { primary: ['Latissimus Dorsi'], secondary: ['Chest', 'Triceps'] } },
  'face-pulls-b':          { name: 'Face Pulls',                        video: mp4(BASE+'male-Machine-machine-face-pulls-front.mp4'),                              muscles: { primary: ['Rear Deltoid'], secondary: ['Trapezius', 'Rhomboids'] } },
  'jm-press':              { name: 'JM Press',                          video: null,                                                                               muscles: { primary: ['Triceps'], secondary: ['Chest'] } },
  'nordic-curl':           { name: 'Nordic Curl',                       video: null,                                                                               muscles: { primary: ['Hamstrings'], secondary: ['Glutes', 'Lower Back'] } },
}

export const PROGRAM = {
  'core': {
    label: 'AM Core',
    day: 'Daily · AM',
    focus: 'Core · Stability',
    color: '#E2D9C8',
    colorClass: 'core',
    exercises: [
      { id: 'dead-bug',    sets: 3, reps: '10 each side', note: 'Press lower back flat into floor throughout', tag: 'stability', isHold: false },
      { id: 'bird-dog',    sets: 3, reps: '10 each side', note: "Don't let hips rotate — slow and controlled", tag: 'stability', isHold: false },
      { id: 'plank',       sets: 3, reps: '40 sec',       note: 'Squeeze glutes and abs simultaneously',       tag: 'hold',     isHold: true },
      { id: 'hollow-body', sets: 3, reps: '25 sec',       note: 'Lower back stays pressed to floor',           tag: 'hold',     isHold: true },
      { id: 'leg-raise',   sets: 3, reps: '12–15',        note: "Control the descent — don't let legs drop",   tag: 'iso',      isHold: false },
      { id: 'side-plank',  sets: 2, reps: '30 sec each',  note: 'Stack feet or stagger for modification',      tag: 'hold',     isHold: true },
    ]
  },
  'push-a': {
    label: 'Push A',
    day: 'Day 1 · Push',
    focus: 'Chest · Shoulders · Triceps',
    color: '#F59E0B',
    colorClass: 'push',
    exercises: [
      { id: 'incline-db-press',       sets: 5, reps: '8–10',  note: 'Neutral grip — 45° incline targets upper chest', tag: 'compound', accent: true },
      { id: 'machine-shoulder-press', sets: 3, reps: '10–12', note: 'Machine keeps path stable — safer for shoulder',  tag: 'compound', accent: true },
      { id: 'cable-chest-fly',        sets: 3, reps: '12–15', note: 'Full stretch at bottom, squeeze at top',          tag: 'iso' },
      { id: 'cable-lateral-raise',    sets: 4, reps: '15–20', note: 'Cable keeps constant tension vs dumbbells',       tag: 'iso' },
      { id: 'rope-pushdown',          sets: 3, reps: '12–15', note: 'Flare rope at bottom for full contraction',       tag: 'iso' },
      { id: 'overhead-tricep-ext',    sets: 3, reps: '12–15', note: 'Long head emphasis — key for arm size',           tag: 'iso' },
    ]
  },
  'pull-a': {
    label: 'Pull A',
    day: 'Day 2 · Pull',
    focus: 'Back · Biceps · Rear Delts',
    color: '#38BDF8',
    colorClass: 'pull',
    exercises: [
      { id: 'lat-pulldown-neutral', sets: 4, reps: '10–12', note: 'Neutral grip reduces shoulder strain',                            tag: 'compound', accent: true },
      { id: 'seated-cable-row',     sets: 4, reps: '8–10',  note: 'Drive elbows back, chest stays tall',                              tag: 'compound', accent: true },
      { id: 'chest-supported-row',  sets: 3, reps: '10–12', note: 'Chest on bench removes lower back stress',                         tag: 'compound', accent: true },
      { id: 'face-pulls',           sets: 4, reps: '15–20', note: 'Critical for shoulder health — never skip',                        tag: 'rehab' },
      { id: 'hammer-curls',         sets: 3, reps: '12–15', note: 'Hits brachialis — adds arm thickness',                             tag: 'iso' },
      { id: 'cable-curl',           sets: 3, reps: '12–15', note: 'Constant tension through full ROM',                                tag: 'iso' },
      { id: 'cable-pullover',       sets: 3, reps: '12–15', note: 'Lat stretch under load — hits a plane rows cannot reach. Arms straight, full overhead stretch', tag: 'optional' },
    ]
  },
  'legs-a': {
    label: 'Legs A',
    day: 'Day 3 · Legs',
    focus: 'Quads · Front Focus',
    color: '#4ADE80',
    colorClass: 'legs',
    exercises: [
      { id: 'belt-squat',          sets: 4, reps: '8–10',  note: 'Zero spinal compression — deep quad and glute stimulus', tag: 'compound', accent: true },
      { id: 'leg-press-high',      sets: 3, reps: '10–12', note: 'Standard foot placement — quad emphasis this day',       tag: 'compound', accent: true },
      { id: 'leg-extension',       sets: 3, reps: '12–15', note: 'Full extension, slow 3-sec lowering',                    tag: 'iso' },
      { id: 'seated-leg-curl',     sets: 4, reps: '12–15', note: 'Keeps hamstrings in the mix on front day',               tag: 'iso' },
      { id: 'machine-abduction',   sets: 3, reps: '15–20', note: 'Glute med strength — improves knee tracking. Start light', tag: 'iso' },
      { id: 'standing-calf-raise', sets: 4, reps: '15–20', note: "Full stretch at bottom — don't bounce",                 tag: 'iso' },
    ]
  },
  'push-b': {
    label: 'Push B',
    day: 'Day 4 · Push',
    focus: 'Chest · Shoulders · Triceps',
    color: '#F59E0B',
    colorClass: 'push',
    exercises: [
      { id: 'flat-db-press',        sets: 4, reps: '8–10',  note: 'Feel the pecs stretch at the bottom of each rep',     tag: 'compound', accent: true },
      { id: 'ez-skull-crusher',     sets: 3, reps: '10–12', note: 'Lower to forehead, explode up',                       tag: 'compound', accent: true },
      { id: 'pec-deck',             sets: 3, reps: '12–15', note: 'Great for pump and mind-muscle connection',            tag: 'iso' },
      { id: 'cable-crossover',      sets: 3, reps: '12–15', note: 'Hits upper pec — slight forward lean',                tag: 'iso' },
      { id: 'machine-lateral-raise',sets: 4, reps: '15–20', note: "Don't shrug at top — lead with elbows",               tag: 'iso' },
      { id: 'single-arm-pushdown',  sets: 3, reps: '12–15', note: 'Eliminates dominant side compensation',               tag: 'iso' },
      { id: 'jm-press',             sets: 3, reps: '8–10',  note: 'Barbell hybrid of close grip press and skull crusher — heaviest tricep load in the program. Keep elbows at 45°', tag: 'optional' },
    ]
  },
  'pull-b': {
    label: 'Pull B',
    day: 'Day 5 · Pull',
    focus: 'Back · Biceps · Rear Delts',
    color: '#38BDF8',
    colorClass: 'pull',
    exercises: [
      { id: 'wide-lat-pulldown',    sets: 4, reps: '10–12', note: 'Wider grip — different lat emphasis from Pull A',     tag: 'compound', accent: true },
      { id: 'single-arm-row',       sets: 4, reps: '10–12', note: 'Brace on bench — big ROM, go heavy',                 tag: 'compound', accent: true },
      { id: 'straight-arm-pulldown',sets: 3, reps: '12–15', note: 'Keep arms straight — isolates lats',                 tag: 'iso' },
      { id: 'reverse-pec-deck',     sets: 3, reps: '15–20', note: 'Shoulder health + rear delt width',                  tag: 'rehab' },
      { id: 'incline-db-curl',      sets: 3, reps: '12–15', note: 'Stretch position hits long head of bicep',           tag: 'iso' },
      { id: 'machine-preacher-curl',sets: 3, reps: '12–15', note: 'Removes cheat — pure bicep isolation',               tag: 'iso' },
      { id: 'face-pulls-b',         sets: 3, reps: '15–20', note: 'Second face pull session of the week — shoulder health needs consistent frequency given your pressing volume', tag: 'optional' },
    ]
  },
  'legs-b': {
    label: 'Legs B',
    day: 'Day 6 · Legs',
    focus: 'Posterior Chain · Glutes · Hamstrings',
    color: '#4ADE80',
    colorClass: 'legs',
    exercises: [
      { id: 'barbell-hip-thrust', sets: 4, reps: '10–12', note: 'Primary overload movement — add weight every week',                  tag: 'compound', accent: true },
      { id: 'rdl-b',             sets: 4, reps: '8–10',  note: 'Hip hinge — feel hamstrings stretch at the bottom',                  tag: 'compound', accent: true },
      { id: 'box-step-up',       sets: 3, reps: '12 each', note: 'Knee-safe unilateral — drive through heel',                        tag: 'compound', accent: true },
      { id: 'lying-leg-curl',    sets: 3, reps: '12–15', note: 'Different angle from seated — shortened position',                   tag: 'iso' },
      { id: 'machine-adduction', sets: 3, reps: '15–20', note: 'Ease in light first 2–3 weeks — soreness can be severe',             tag: 'iso' },
      { id: 'seated-calf-raise', sets: 4, reps: '15–20', note: 'Soleus focus — pairs with standing calf raise',                      tag: 'iso' },
      { id: 'nordic-curl',       sets: 3, reps: '4–6',   note: 'Most effective hamstring eccentric movement. Anchor feet, lower slowly under full control — brutally hard, start with 4 reps', tag: 'optional' },
    ]
  },
}

export const PROGRAM_ORDER = ['push-a', 'pull-a', 'legs-a', 'push-b', 'pull-b', 'legs-b']

export const TAG_LABELS = {
  compound: 'Compound',
  iso: 'Isolation',
  rehab: 'Shoulder health',
  stability: 'Stability',
  hold: 'Hold',
  optional: 'Optional',
}
