-- ============================================================
-- EXERCISE LIBRARY — Full seed
-- Covers all major muscle groups and equipment types.
-- Videos are null — add them later via the admin or Supabase.
-- Safe to re-run: ON CONFLICT (slug) DO NOTHING
-- ============================================================

insert into exercises (slug, name, muscles, secondary_muscles, tags, video_url, notes) values

-- ============================================================
-- CHEST
-- ============================================================

-- Barbell
('barbell-bench-press',         'Barbell Bench Press',              '{Upper Chest,Lower Chest}',        '{Front Deltoid,Triceps}',              '{chest,compound,barbell}',     null, 'Arch slightly, drive feet into floor, bar touches mid-chest'),
('barbell-incline-bench-press', 'Incline Barbell Bench Press',      '{Upper Chest}',                    '{Front Deltoid,Triceps}',              '{chest,compound,barbell}',     null, '30–45° incline, bar to upper chest'),
('barbell-decline-bench-press', 'Decline Barbell Bench Press',      '{Lower Chest}',                    '{Front Deltoid,Triceps}',              '{chest,compound,barbell}',     null, 'Emphasises lower pec, keep elbows tucked'),
('close-grip-bench-press',      'Close Grip Bench Press',           '{Upper Chest,Lower Chest}',        '{Triceps,Front Deltoid}',              '{chest,triceps,compound,barbell}', null, 'Hands shoulder-width, elbows stay in'),

-- Dumbbell
('db-bench-press',              'Dumbbell Bench Press',             '{Upper Chest,Lower Chest}',        '{Front Deltoid,Triceps}',              '{chest,compound,dumbbell}',    null, 'Greater ROM than barbell, feel the stretch at the bottom'),
('db-incline-press',            'Dumbbell Incline Press',           '{Upper Chest}',                    '{Front Deltoid,Triceps}',              '{chest,compound,dumbbell}',    null, 'Neutral or pronated grip, 30–45° bench'),
('db-decline-press',            'Dumbbell Decline Press',           '{Lower Chest}',                    '{Triceps,Front Deltoid}',              '{chest,compound,dumbbell}',    null, 'Feet anchored, full stretch at bottom'),
('db-fly',                      'Dumbbell Fly',                     '{Upper Chest,Lower Chest}',        '{Front Deltoid}',                      '{chest,iso,dumbbell}',         null, 'Slight bend in elbows throughout, squeeze at top'),
('db-incline-fly',              'Dumbbell Incline Fly',             '{Upper Chest}',                    '{Front Deltoid}',                      '{chest,iso,dumbbell}',         null, 'Focus on upper pec stretch'),
('db-pullover',                 'Dumbbell Pullover',                '{Lower Chest}',                    '{Latissimus Dorsi,Triceps}',           '{chest,iso,dumbbell}',         null, 'Keep slight elbow bend, feel the chest stretch at the top'),

-- Cable
('cable-fly-high',              'Cable Fly — High to Low',          '{Lower Chest}',                    '{Front Deltoid}',                      '{chest,iso,cable}',            null, 'Cables high, pull down and together'),
('cable-fly-low',               'Cable Fly — Low to High',          '{Upper Chest}',                    '{Front Deltoid}',                      '{chest,iso,cable}',            null, 'Cables low, pull up and together — upper pec emphasis'),
('cable-fly-mid',               'Cable Fly — Neutral',              '{Upper Chest,Lower Chest}',        '{Front Deltoid}',                      '{chest,iso,cable}',            null, 'Cables at chest height, full ROM'),
('cable-chest-press',           'Cable Chest Press',                '{Upper Chest,Lower Chest}',        '{Triceps,Front Deltoid}',              '{chest,compound,cable}',       null, 'Constant tension vs barbell'),

-- Machine
('machine-chest-press',         'Machine Chest Press',              '{Upper Chest,Lower Chest}',        '{Triceps,Front Deltoid}',              '{chest,compound,machine}',     null, 'Controlled path, great for beginners and dropsets'),
('machine-incline-press',       'Machine Incline Press',            '{Upper Chest}',                    '{Triceps,Front Deltoid}',              '{chest,compound,machine}',     null, 'Fixed path reduces shoulder strain'),
('machine-pec-fly',             'Machine Pec Fly (Pec Deck)',       '{Upper Chest,Lower Chest}',        '{}',                                   '{chest,iso,machine}',          null, 'Great for mind-muscle, dropsets at end of session'),
('machine-pec-fly-incline',     'Machine Incline Fly',              '{Upper Chest}',                    '{}',                                   '{chest,iso,machine}',          null, 'Arm pads at incline angle, upper pec focus'),

-- Bodyweight
('pushup',                      'Push-Up',                          '{Upper Chest,Lower Chest}',        '{Front Deltoid,Triceps,Core / Abs}',   '{chest,compound,bodyweight}',  null, 'Full range, chest touches floor, elbows 45°'),
('pushup-wide',                 'Wide Push-Up',                     '{Upper Chest,Lower Chest}',        '{Front Deltoid}',                      '{chest,compound,bodyweight}',  null, 'Wider hand placement, more chest emphasis'),
('pushup-diamond',              'Diamond Push-Up',                  '{Upper Chest,Lower Chest}',        '{Triceps}',                            '{chest,triceps,compound,bodyweight}', null, 'Hands form diamond shape, triceps dominant'),
('pushup-decline',              'Decline Push-Up',                  '{Upper Chest}',                    '{Front Deltoid,Triceps}',              '{chest,compound,bodyweight}',  null, 'Feet elevated, targets upper chest'),
('dips-chest',                  'Chest Dips',                       '{Lower Chest}',                    '{Triceps,Front Deltoid}',              '{chest,compound,bodyweight}',  null, 'Lean forward 30°, elbows flare out slightly'),

-- ============================================================
-- BACK
-- ============================================================

-- Deadlift variations
('conventional-deadlift',       'Conventional Deadlift',            '{Latissimus Dorsi,Lower Back}',    '{Hamstrings,Glutes,Trapezius}',        '{back,compound,barbell}',      null, 'Hip hinge, bar stays over mid-foot, neutral spine'),
('sumo-deadlift',               'Sumo Deadlift',                    '{Lower Back,Glutes}',              '{Hamstrings,Latissimus Dorsi}',        '{back,legs,compound,barbell}', null, 'Wide stance, toes out, grip inside knees'),
('romanian-deadlift',           'Romanian Deadlift (Barbell)',      '{Hamstrings,Glutes}',              '{Lower Back,Latissimus Dorsi}',        '{back,legs,compound,barbell}', null, 'Hinge at hips, soft knee bend, bar tracks down legs'),
('trap-bar-deadlift',           'Trap Bar Deadlift',                '{Lower Back,Glutes,Quadriceps}',   '{Hamstrings,Trapezius}',               '{back,legs,compound,barbell}', null, 'More quad-friendly than conventional, great for athletes'),
('rack-pull',                   'Rack Pull',                        '{Lower Back,Trapezius}',           '{Latissimus Dorsi,Glutes}',            '{back,compound,barbell}',      null, 'Bar starts at knee height, overload for upper back'),

-- Rows — Barbell
('barbell-row',                 'Barbell Bent-Over Row',            '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,barbell}',      null, 'Hinge 45°, pull to lower sternum, elbows back'),
('barbell-pendlay-row',         'Pendlay Row',                      '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,barbell}',      null, 'Dead stop each rep from floor, explosive pull'),
('barbell-yates-row',           'Yates Row',                        '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,barbell}',      null, 'More upright torso, underhand grip, heavy'),

-- Rows — Dumbbell
('db-row',                      'Dumbbell Row',                     '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,dumbbell}',     null, 'Brace on bench, full ROM, big stretch at bottom'),
('db-incline-row',              'Incline Dumbbell Row',             '{Rhomboids,Latissimus Dorsi}',     '{Biceps,Rear Deltoid}',                '{back,compound,dumbbell}',     null, 'Chest on incline bench, eliminates lower back stress'),
('db-meadows-row',              'Meadows Row',                      '{Latissimus Dorsi}',               '{Biceps,Rear Deltoid}',                '{back,compound,dumbbell}',     null, 'Landmine-style unilateral row, great lat stretch'),

-- Rows — Cable
('seated-row',                  'Seated Cable Row',                 '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,cable}',        null, 'Drive elbows back, squeeze shoulder blades'),
('seated-row-wide',             'Wide Grip Seated Row',             '{Rhomboids,Rear Deltoid}',         '{Biceps,Latissimus Dorsi}',            '{back,compound,cable}',        null, 'Wide bar, elbows stay high — upper back focus'),
('cable-row-single',            'Single Arm Cable Row',             '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,cable}',        null, 'Greater ROM than two-arm version'),
('cable-pullover-lat',          'Cable Pullover',                   '{Latissimus Dorsi}',               '{Chest,Triceps}',                      '{back,iso,cable}',             null, 'Arms straight, lat isolation from overhead stretch'),

-- Rows — Machine
('machine-row',                 'Machine Row',                      '{Latissimus Dorsi,Rhomboids}',     '{Biceps,Rear Deltoid}',                '{back,compound,machine}',      null, 'Chest pad removes lower back, great for focus'),
('machine-row-high',            'High Row Machine',                 '{Rhomboids,Rear Deltoid}',         '{Biceps,Trapezius}',                   '{back,compound,machine}',      null, 'Elbows high, upper back and rear delt emphasis'),

-- Pulldowns
('lat-pulldown',                'Lat Pulldown — Overhand',          '{Latissimus Dorsi}',               '{Biceps,Rear Deltoid}',                '{back,compound,cable}',        null, 'Full stretch at top, pull to upper chest'),
('lat-pulldown-neutral',        'Lat Pulldown — Neutral Grip',      '{Latissimus Dorsi}',               '{Biceps,Rear Deltoid,Rhomboids}',      '{back,compound,cable}',        null, 'Neutral grip reduces shoulder strain'),
('lat-pulldown-underhand',      'Lat Pulldown — Underhand',         '{Latissimus Dorsi}',               '{Biceps}',                             '{back,compound,cable}',        null, 'Supinated grip, more bicep involvement'),
('lat-pulldown-single',         'Single Arm Lat Pulldown',          '{Latissimus Dorsi}',               '{Biceps}',                             '{back,iso,cable}',             null, 'Greater stretch and ROM than bilateral'),
('straight-arm-pulldown',       'Straight Arm Pulldown',            '{Latissimus Dorsi}',               '{}',                                   '{back,iso,cable}',             null, 'Arms stay straight throughout, pure lat isolation'),

-- Pull-Ups / Chin-Ups
('pullup',                      'Pull-Up',                          '{Latissimus Dorsi}',               '{Biceps,Rear Deltoid,Rhomboids}',      '{back,compound,bodyweight}',   null, 'Full ROM, dead hang at bottom, chin over bar at top'),
('chinup',                      'Chin-Up',                          '{Latissimus Dorsi}',               '{Biceps}',                             '{back,compound,bodyweight}',   null, 'Supinated grip, more bicep dominant'),
('neutral-grip-pullup',         'Neutral Grip Pull-Up',             '{Latissimus Dorsi}',               '{Biceps,Rhomboids}',                   '{back,compound,bodyweight}',   null, 'Easiest on the shoulders'),
('weighted-pullup',             'Weighted Pull-Up',                 '{Latissimus Dorsi}',               '{Biceps,Rear Deltoid}',                '{back,compound,bodyweight}',   null, 'Belt or vest, same technique as bodyweight'),
('assisted-pullup',             'Assisted Pull-Up',                 '{Latissimus Dorsi}',               '{Biceps}',                             '{back,compound,machine}',      null, 'Band or machine assistance to build strength'),

-- Upper back / traps
('barbell-shrug',               'Barbell Shrug',                    '{Trapezius}',                      '{}',                                   '{back,iso,barbell}',           null, 'Straight up, brief pause at top, no rolling'),
('db-shrug',                    'Dumbbell Shrug',                   '{Trapezius}',                      '{}',                                   '{back,iso,dumbbell}',          null, 'Full ROM, hold at top'),
('cable-shrug',                 'Cable Shrug',                      '{Trapezius}',                      '{}',                                   '{back,iso,cable}',             null, 'Constant tension version'),
('face-pull',                   'Face Pull',                        '{Rear Deltoid}',                   '{Trapezius,Rhomboids}',                '{back,rehab,cable}',           null, 'Rope to face level, external rotation at end — shoulder health'),
('reverse-fly-db',              'Reverse Dumbbell Fly',             '{Rear Deltoid}',                   '{Rhomboids,Trapezius}',                '{back,iso,dumbbell}',          null, 'Hinge forward, lead with elbows, light weight'),
('reverse-fly-cable',           'Reverse Cable Fly',                '{Rear Deltoid}',                   '{Rhomboids,Trapezius}',                '{back,iso,cable}',             null, 'Cross cables, pull apart at chest height'),
('reverse-fly-machine',         'Reverse Pec Deck',                 '{Rear Deltoid}',                   '{Rhomboids,Trapezius}',                '{back,iso,machine}',           null, 'Seated, arms in reverse fly position'),
('good-morning',                'Good Morning',                     '{Lower Back,Hamstrings}',          '{Glutes}',                             '{back,legs,compound,barbell}', null, 'Bar on upper back, hinge at hips, keep neutral spine'),
('hyperextension',              'Hyperextension',                   '{Lower Back}',                     '{Glutes,Hamstrings}',                  '{back,iso,bodyweight}',        null, 'GHD or 45° bench, control the ROM'),
('reverse-hyperextension',      'Reverse Hyperextension',           '{Lower Back,Glutes}',              '{Hamstrings}',                         '{back,iso,machine}',           null, 'Legs swing up behind, lower back extension'),

-- ============================================================
-- SHOULDERS
-- ============================================================

-- Press
('barbell-ohp',                 'Barbell Overhead Press',           '{Front Deltoid,Lateral Deltoid}',  '{Triceps,Upper Chest}',                '{shoulders,compound,barbell}', null, 'Bar from front rack, press overhead, lock out'),
('barbell-push-press',          'Push Press',                       '{Front Deltoid,Lateral Deltoid}',  '{Triceps,Quadriceps}',                 '{shoulders,compound,barbell}', null, 'Slight leg drive to initiate, lock out overhead'),
('db-shoulder-press',           'Dumbbell Shoulder Press',          '{Front Deltoid,Lateral Deltoid}',  '{Triceps}',                            '{shoulders,compound,dumbbell}', null, 'Seated or standing, elbows 90° at start'),
('db-arnold-press',             'Arnold Press',                     '{Front Deltoid,Lateral Deltoid}',  '{Triceps,Rear Deltoid}',               '{shoulders,compound,dumbbell}', null, 'Rotate as you press — hits all three heads'),
('machine-shoulder-press',      'Machine Shoulder Press',           '{Front Deltoid,Lateral Deltoid}',  '{Triceps}',                            '{shoulders,compound,machine}', null, 'Fixed path, great for stability and volume'),
('cable-overhead-press',        'Cable Overhead Press',             '{Front Deltoid,Lateral Deltoid}',  '{Triceps}',                            '{shoulders,compound,cable}',   null, 'Single arm or both, constant tension'),
('landmine-press',              'Landmine Press',                   '{Front Deltoid}',                  '{Upper Chest,Triceps}',                '{shoulders,compound,barbell}', null, 'Shoulder-friendly pressing angle'),

-- Lateral raises
('db-lateral-raise',            'Dumbbell Lateral Raise',           '{Lateral Deltoid}',                '{}',                                   '{shoulders,iso,dumbbell}',     null, 'Lead with elbows, slight forward lean, no shrugging'),
('cable-lateral-raise',         'Cable Lateral Raise',              '{Lateral Deltoid}',                '{}',                                   '{shoulders,iso,cable}',        null, 'Cable across body, constant tension vs dumbbell'),
('machine-lateral-raise',       'Machine Lateral Raise',            '{Lateral Deltoid}',                '{}',                                   '{shoulders,iso,machine}',      null, 'Fixed path, great for high rep isolation'),
('db-lateral-raise-seated',     'Seated Dumbbell Lateral Raise',    '{Lateral Deltoid}',                '{}',                                   '{shoulders,iso,dumbbell}',     null, 'Seated reduces cheating with body momentum'),
('cable-y-raise',               'Cable Y-Raise',                    '{Lateral Deltoid,Rear Deltoid}',   '{}',                                   '{shoulders,rehab,cable}',      null, 'Arms form a Y at the top, rotator cuff friendly'),

-- Front raises
('db-front-raise',              'Dumbbell Front Raise',             '{Front Deltoid}',                  '{}',                                   '{shoulders,iso,dumbbell}',     null, 'Lift to eye level, avoid using momentum'),
('barbell-front-raise',         'Barbell Front Raise',              '{Front Deltoid}',                  '{}',                                   '{shoulders,iso,barbell}',      null, 'Overhand grip, arms parallel to floor at top'),
('cable-front-raise',           'Cable Front Raise',                '{Front Deltoid}',                  '{}',                                   '{shoulders,iso,cable}',        null, 'Low pulley, constant tension'),
('plate-front-raise',           'Plate Front Raise',                '{Front Deltoid}',                  '{}',                                   '{shoulders,iso,barbell}',      null, 'Both hands on plate edges, neutral wrist position'),

-- Rear delt
('db-rear-delt-fly',            'Rear Delt Dumbbell Fly',           '{Rear Deltoid}',                   '{Rhomboids,Trapezius}',                '{shoulders,iso,dumbbell}',     null, 'Chest on incline bench or bent over'),
('cable-rear-delt-fly',         'Rear Delt Cable Fly',              '{Rear Deltoid}',                   '{Rhomboids}',                          '{shoulders,iso,cable}',        null, 'Cables crossed, pull apart at chest height'),
('band-pull-apart',             'Band Pull Apart',                  '{Rear Deltoid}',                   '{Rhomboids,Trapezius}',                '{shoulders,rehab,bodyweight}', null, 'Shoulder health staple, high reps, lightweight band'),
('ws-raise',                    'W-S Raise',                        '{Rear Deltoid,Rhomboids}',         '{}',                                   '{shoulders,rehab,dumbbell}',   null, 'Prone on bench, W then S movement pattern'),

-- ============================================================
-- BICEPS
-- ============================================================

('barbell-curl',                'Barbell Curl',                     '{Biceps}',                         '{}',                                   '{biceps,compound,barbell}',    null, 'Full ROM, control the eccentric'),
('barbell-curl-21s',            'Barbell Curl 21s',                 '{Biceps}',                         '{}',                                   '{biceps,iso,barbell}',         null, '7 bottom half, 7 top half, 7 full reps'),
('ez-curl',                     'EZ Bar Curl',                      '{Biceps}',                         '{}',                                   '{biceps,iso,barbell}',         null, 'Angled grip is easier on wrists'),
('db-curl',                     'Dumbbell Curl',                    '{Biceps}',                         '{}',                                   '{biceps,iso,dumbbell}',        null, 'Alternate or simultaneous, supinate at top'),
('db-hammer-curl',              'Hammer Curl',                      '{Biceps}',                         '{Brachialis}',                         '{biceps,iso,dumbbell}',        null, 'Neutral grip adds brachialis thickness'),
('db-incline-curl',             'Incline Dumbbell Curl',            '{Biceps}',                         '{}',                                   '{biceps,iso,dumbbell}',        null, 'Long head stretch — incline bench essential'),
('db-concentration-curl',       'Concentration Curl',               '{Biceps}',                         '{}',                                   '{biceps,iso,dumbbell}',        null, 'Elbow braced on inner thigh, peak contraction'),
('db-spider-curl',              'Spider Curl',                      '{Biceps}',                         '{}',                                   '{biceps,iso,dumbbell}',        null, 'Chest on incline bench, elbows hang free'),
('db-zottman-curl',             'Zottman Curl',                     '{Biceps}',                         '{Brachialis}',                         '{biceps,iso,dumbbell}',        null, 'Supinate up, pronate down — hits everything'),
('cable-curl-low',              'Cable Curl',                       '{Biceps}',                         '{}',                                   '{biceps,iso,cable}',           null, 'Constant tension throughout ROM'),
('cable-curl-high',             'Cable Curl — High Pulley',         '{Biceps}',                         '{}',                                   '{biceps,iso,cable}',           null, 'Arms overhead, long head stretch'),
('cable-hammer-curl',           'Cable Hammer Curl',                '{Biceps}',                         '{Brachialis}',                         '{biceps,iso,cable}',           null, 'Rope attachment, neutral grip'),
('machine-preacher-curl',       'Machine Preacher Curl',            '{Biceps}',                         '{}',                                   '{biceps,iso,machine}',         null, 'Removes cheat — strict bicep isolation'),
('barbell-preacher-curl',       'Barbell Preacher Curl',            '{Biceps}',                         '{}',                                   '{biceps,iso,barbell}',         null, 'Arms on pad, full stretch at bottom'),
('db-preacher-curl',            'Dumbbell Preacher Curl',           '{Biceps}',                         '{}',                                   '{biceps,iso,dumbbell}',        null, 'Single arm on preacher pad'),
('cable-cross-curl',            'Cross Body Cable Curl',            '{Biceps}',                         '{}',                                   '{biceps,iso,cable}',           null, 'Pull across body, unique angle hits peak'),
('reverse-curl',                'Reverse Curl',                     '{Biceps}',                         '{Brachialis}',                         '{biceps,iso,barbell}',         null, 'Overhand grip, forearm development too'),

-- ============================================================
-- TRICEPS
-- ============================================================

('barbell-skullcrusher',        'EZ Bar Skull Crusher',             '{Triceps}',                        '{}',                                   '{triceps,iso,barbell}',        null, 'Lower to forehead, explode up, long head emphasis'),
('db-skullcrusher',             'Dumbbell Skull Crusher',           '{Triceps}',                        '{}',                                   '{triceps,iso,dumbbell}',       null, 'Greater stretch than barbell version'),
('close-grip-bench',            'Close Grip Bench Press',           '{Triceps}',                        '{Upper Chest,Lower Chest}',            '{triceps,compound,barbell}',   null, 'Shoulder-width grip, elbows stay tucked'),
('tricep-dips',                 'Tricep Dips',                      '{Triceps}',                        '{Front Deltoid,Lower Chest}',          '{triceps,compound,bodyweight}', null, 'Upright torso, elbows point back'),
('weighted-tricep-dips',        'Weighted Tricep Dips',             '{Triceps}',                        '{Front Deltoid}',                      '{triceps,compound,bodyweight}', null, 'Belt or dumbbell between legs'),
('cable-pushdown-bar',          'Cable Pushdown — Bar',             '{Triceps}',                        '{}',                                   '{triceps,iso,cable}',          null, 'Straight or EZ bar, elbows tucked at sides'),
('cable-pushdown-rope',         'Cable Pushdown — Rope',            '{Triceps}',                        '{}',                                   '{triceps,iso,cable}',          null, 'Flare rope at bottom for full contraction'),
('cable-pushdown-single',       'Single Arm Cable Pushdown',        '{Triceps}',                        '{}',                                   '{triceps,iso,cable}',          null, 'Eliminates dominant side compensation'),
('cable-overhead-ext',          'Cable Overhead Tricep Extension',  '{Triceps}',                        '{}',                                   '{triceps,iso,cable}',          null, 'Long head emphasis — key for arm size'),
('cable-overhead-ext-rope',     'Overhead Cable Extension — Rope',  '{Triceps}',                        '{}',                                   '{triceps,iso,cable}',          null, 'Rope attachment, full stretch overhead'),
('db-overhead-ext',             'Dumbbell Overhead Extension',      '{Triceps}',                        '{}',                                   '{triceps,iso,dumbbell}',       null, 'Both hands on one dumbbell, elbows stay in'),
('db-overhead-ext-single',      'Single Arm Overhead DB Extension', '{Triceps}',                        '{}',                                   '{triceps,iso,dumbbell}',       null, 'Elbow points straight up, full ROM'),
('db-kickback',                 'Tricep Kickback',                  '{Triceps}',                        '{}',                                   '{triceps,iso,dumbbell}',       null, 'Hinge forward, arm parallel to floor, extend fully'),
('machine-tricep-ext',          'Machine Tricep Extension',         '{Triceps}',                        '{}',                                   '{triceps,iso,machine}',        null, 'Overhead or pushdown machine'),
('jm-press',                    'JM Press',                         '{Triceps}',                        '{Upper Chest,Lower Chest}',            '{triceps,compound,barbell}',   null, 'Hybrid of skull crusher and bench press — very heavy'),
('diamond-pushup-tri',          'Diamond Push-Up',                  '{Triceps}',                        '{Upper Chest}',                        '{triceps,compound,bodyweight}', null, 'Hands form diamond under chest'),

-- ============================================================
-- QUADRICEPS
-- ============================================================

('barbell-squat',               'Barbell Back Squat',               '{Quadriceps,Glutes}',              '{Hamstrings,Lower Back}',              '{legs,quads,compound,barbell}', null, 'High bar or low bar, depth past parallel'),
('barbell-front-squat',         'Barbell Front Squat',              '{Quadriceps}',                     '{Glutes,Upper Back}',                  '{legs,quads,compound,barbell}', null, 'Bar on front deltoids, more upright torso, quad dominant'),
('barbell-pause-squat',         'Pause Squat',                      '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,barbell}', null, '2–3 sec pause at bottom, eliminates stretch reflex'),
('barbell-box-squat',           'Box Squat',                        '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,barbell}', null, 'Controlled descent to box, teaches proper depth'),
('barbell-hack-squat',          'Barbell Hack Squat',               '{Quadriceps}',                     '{Glutes}',                             '{legs,quads,compound,barbell}', null, 'Bar behind legs, quad isolation'),
('machine-hack-squat',          'Machine Hack Squat',               '{Quadriceps}',                     '{Glutes,Hamstrings}',                  '{legs,quads,compound,machine}', null, '45° sled, feet placement changes emphasis'),
('belt-squat',                  'Belt Squat',                       '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,machine}', null, 'Zero spinal load — great for high volume'),
('leg-press',                   'Leg Press',                        '{Quadriceps}',                     '{Glutes,Hamstrings}',                  '{legs,quads,compound,machine}', null, 'Foot placement changes emphasis — high=glutes, low=quads'),
('leg-press-narrow',            'Leg Press — Narrow Stance',        '{Quadriceps}',                     '{}',                                   '{legs,quads,compound,machine}', null, 'Feet close together, quad dominant'),
('leg-extension',               'Leg Extension',                    '{Quadriceps}',                     '{}',                                   '{legs,quads,iso,machine}',     null, 'Full extension, 2–3 sec lowering'),
('goblet-squat',                'Goblet Squat',                     '{Quadriceps,Glutes}',              '{Core / Abs}',                         '{legs,quads,compound,dumbbell}', null, 'DB or KB at chest, great for learning squat pattern'),
('db-split-squat',              'Dumbbell Split Squat',             '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,dumbbell}', null, 'Rear foot on floor, front foot forward'),
('barbell-split-squat',         'Barbell Split Squat',              '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,barbell}', null, 'Bar on back, static lunge position'),
('bulgarian-split-squat',       'Bulgarian Split Squat',            '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,dumbbell}', null, 'Rear foot elevated, brutal quad and glute stimulus'),
('walking-lunge',               'Walking Lunge',                    '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,dumbbell}', null, 'Step forward, knee hovers above floor'),
('reverse-lunge',               'Reverse Lunge',                    '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,bodyweight}', null, 'Step back instead of forward — easier on knees'),
('step-up',                     'Box Step Up',                      '{Quadriceps,Glutes}',              '{Hamstrings}',                         '{legs,quads,compound,dumbbell}', null, 'Drive through heel of front foot'),
('sissy-squat',                 'Sissy Squat',                      '{Quadriceps}',                     '{}',                                   '{legs,quads,iso,bodyweight}',  null, 'Lean back, knees forward over toes — extreme quad stretch'),
('leg-extension-single',        'Single Leg Extension',             '{Quadriceps}',                     '{}',                                   '{legs,quads,iso,machine}',     null, 'Unilateral, fixes imbalances'),

-- ============================================================
-- HAMSTRINGS
-- ============================================================

('db-rdl',                      'Romanian Deadlift — Dumbbell',     '{Hamstrings,Glutes}',              '{Lower Back}',                         '{legs,hamstrings,compound,dumbbell}', null, 'Hip hinge, feel the hamstring stretch'),
('barbell-rdl',                 'Romanian Deadlift — Barbell',      '{Hamstrings,Glutes}',              '{Lower Back}',                         '{legs,hamstrings,compound,barbell}', null, 'Bar tracks down shins, neutral spine'),
('single-leg-rdl',              'Single Leg RDL',                   '{Hamstrings,Glutes}',              '{Lower Back,Core / Abs}',              '{legs,hamstrings,compound,dumbbell}', null, 'Balance challenge, excellent hamstring isolation'),
('lying-leg-curl',              'Lying Leg Curl',                   '{Hamstrings}',                     '{}',                                   '{legs,hamstrings,iso,machine}', null, 'Prone, curl fully, squeeze at top'),
('seated-leg-curl',             'Seated Leg Curl',                  '{Hamstrings}',                     '{}',                                   '{legs,hamstrings,iso,machine}', null, 'Hip flexed position, different stimulus to lying'),
('standing-leg-curl',           'Standing Leg Curl',                '{Hamstrings}',                     '{}',                                   '{legs,hamstrings,iso,machine}', null, 'Single leg, full ROM'),
('nordic-curl',                 'Nordic Curl',                      '{Hamstrings}',                     '{Glutes,Lower Back}',                  '{legs,hamstrings,compound,bodyweight}', null, 'Most effective hamstring eccentric — very challenging'),
('glute-ham-raise',             'Glute Ham Raise',                  '{Hamstrings,Glutes}',              '{Lower Back}',                         '{legs,hamstrings,compound,bodyweight}', null, 'GHD machine, hamstring and glute focus'),
('cable-pull-through',          'Cable Pull Through',               '{Hamstrings,Glutes}',              '{Lower Back}',                         '{legs,hamstrings,compound,cable}', null, 'Hip hinge with cable between legs'),
('db-stiff-leg-deadlift',       'Stiff-Leg Deadlift',               '{Hamstrings}',                     '{Lower Back,Glutes}',                  '{legs,hamstrings,compound,dumbbell}', null, 'Legs straight (soft knee), extreme stretch'),

-- ============================================================
-- GLUTES
-- ============================================================

('barbell-hip-thrust',          'Barbell Hip Thrust',               '{Glutes}',                         '{Hamstrings}',                         '{legs,glutes,compound,barbell}', null, 'Upper back on bench, barbell over hips, full extension'),
('db-hip-thrust',               'Dumbbell Hip Thrust',              '{Glutes}',                         '{Hamstrings}',                         '{legs,glutes,compound,dumbbell}', null, 'Lighter but constant tension option'),
('single-leg-hip-thrust',       'Single Leg Hip Thrust',            '{Glutes}',                         '{Hamstrings}',                         '{legs,glutes,compound,bodyweight}', null, 'More glute activation per rep'),
('machine-hip-thrust',          'Machine Hip Thrust',               '{Glutes}',                         '{Hamstrings}',                         '{legs,glutes,compound,machine}', null, 'Dedicated hip thrust machine, easiest to load'),
('cable-kickback',              'Cable Kickback',                   '{Glutes}',                         '{Hamstrings}',                         '{legs,glutes,iso,cable}',      null, 'Ankle strap, full hip extension at top'),
('db-kickback-quad',            'Donkey Kickback',                  '{Glutes}',                         '{}',                                   '{legs,glutes,iso,bodyweight}', null, 'On all fours, kick heel to ceiling'),
('sumo-squat',                  'Sumo Squat',                       '{Glutes,Inner Thigh}',             '{Quadriceps}',                         '{legs,glutes,compound,dumbbell}', null, 'Wide stance, toes pointed out'),
('frog-pump',                   'Frog Pump',                        '{Glutes}',                         '{}',                                   '{legs,glutes,iso,bodyweight}', null, 'Feet together, bridge position, high reps'),
('machine-abduction',           'Hip Abduction Machine',            '{Glutes}',                         '{Hip Flexors}',                        '{legs,glutes,iso,machine}',    null, 'Glute med strength — improves knee tracking'),
('cable-abduction',             'Cable Hip Abduction',              '{Glutes}',                         '{}',                                   '{legs,glutes,iso,cable}',      null, 'Ankle strap, standing abduction'),
('machine-adduction',           'Hip Adduction Machine',            '{Hip Flexors}',                    '{Quadriceps}',                         '{legs,glutes,iso,machine}',    null, 'Start very light — DOMS can be severe for first 2 weeks'),
('banded-squat',                'Banded Squat Walk',                '{Glutes}',                         '{Hip Flexors}',                        '{legs,glutes,iso,bodyweight}', null, 'Band above knees, lateral steps, glute activation'),
('glute-bridge',                'Glute Bridge',                     '{Glutes}',                         '{Hamstrings}',                         '{legs,glutes,compound,bodyweight}', null, 'Bodyweight hip thrust, regression for hip thrust'),
('good-morning-glute',          'Good Morning',                     '{Glutes,Hamstrings}',              '{Lower Back}',                         '{legs,glutes,compound,barbell}', null, 'Bar on back, hip hinge, posterior chain'),

-- ============================================================
-- CALVES
-- ============================================================

('standing-calf-raise-machine', 'Standing Calf Raise — Machine',   '{Calves}',                         '{}',                                   '{legs,calves,iso,machine}',    null, 'Full stretch at bottom, pause at top'),
('standing-calf-raise-db',      'Standing Calf Raise — Dumbbell',  '{Calves}',                         '{}',                                   '{legs,calves,iso,dumbbell}',   null, 'One or two dumbbells, use a step for ROM'),
('seated-calf-raise',           'Seated Calf Raise',                '{Calves}',                         '{}',                                   '{legs,calves,iso,machine}',    null, 'Soleus emphasis — different from standing'),
('leg-press-calf-raise',        'Leg Press Calf Raise',             '{Calves}',                         '{}',                                   '{legs,calves,iso,machine}',    null, 'Toes on edge of leg press platform'),
('single-leg-calf-raise',       'Single Leg Calf Raise',            '{Calves}',                         '{}',                                   '{legs,calves,iso,bodyweight}', null, 'Bodyweight, use step for ROM, slow and controlled'),
('barbell-calf-raise',          'Barbell Calf Raise',               '{Calves}',                         '{}',                                   '{legs,calves,iso,barbell}',    null, 'Bar on back, standing on plates'),
('jump-rope',                   'Jump Rope',                        '{Calves}',                         '{Core / Abs}',                         '{legs,calves,cardio,bodyweight}', null, 'Great calf and conditioning work'),

-- ============================================================
-- CORE / ABS
-- ============================================================

-- Rectus Abdominis
('crunch',                      'Crunch',                           '{Core / Abs}',                     '{}',                                   '{core,iso,bodyweight}',        null, 'Short ROM, focus on contracting abs'),
('cable-crunch',                'Cable Crunch',                     '{Core / Abs}',                     '{}',                                   '{core,iso,cable}',             null, 'Kneeling or seated, rope attachment overhead'),
('decline-crunch',              'Decline Crunch',                   '{Core / Abs}',                     '{}',                                   '{core,iso,bodyweight}',        null, 'Decline bench, hands behind head'),
('situp',                       'Sit-Up',                           '{Core / Abs,Hip Flexors}',         '{}',                                   '{core,compound,bodyweight}',   null, 'Full ROM, touch elbows to knees'),
('weighted-situp',              'Weighted Sit-Up',                  '{Core / Abs}',                     '{}',                                   '{core,iso,dumbbell}',          null, 'Plate or dumbbell at chest'),
('machine-crunch',              'Ab Machine Crunch',                '{Core / Abs}',                     '{}',                                   '{core,iso,machine}',           null, 'Controlled resistance, good for progressive overload'),
('v-up',                        'V-Up',                             '{Core / Abs,Hip Flexors}',         '{}',                                   '{core,compound,bodyweight}',   null, 'Meet hands and feet in the middle'),
('toes-to-bar',                 'Toes to Bar',                      '{Core / Abs,Hip Flexors}',         '{Latissimus Dorsi}',                   '{core,compound,bodyweight}',   null, 'Hanging, strict or kipping'),
('hanging-knee-raise',          'Hanging Knee Raise',               '{Core / Abs,Hip Flexors}',         '{}',                                   '{core,compound,bodyweight}',   null, 'Regression for toes to bar'),
('lying-leg-raise',             'Lying Leg Raise',                  '{Core / Abs,Hip Flexors}',         '{}',                                   '{core,iso,bodyweight}',        null, 'Control descent, lower back stays flat'),
('reverse-crunch',              'Reverse Crunch',                   '{Core / Abs}',                     '{}',                                   '{core,iso,bodyweight}',        null, 'Pull knees to chest, lift hips off floor'),
('ab-wheel-rollout',            'Ab Wheel Rollout',                 '{Core / Abs}',                     '{Lower Back,Latissimus Dorsi}',        '{core,compound,bodyweight}',   null, 'Keep hips up, go only as far as form holds'),

-- Anti-rotation / Stability
('plank',                       'Plank',                            '{Core / Abs}',                     '{Front Deltoid}',                      '{core,hold,bodyweight}',       null, 'Squeeze glutes and abs simultaneously'),
('side-plank',                  'Side Plank',                       '{Core / Abs}',                     '{Glutes}',                             '{core,hold,bodyweight}',       null, 'Stack or stagger feet, hip stays up'),
('plank-reach',                 'Plank Shoulder Tap',               '{Core / Abs}',                     '{Front Deltoid}',                      '{core,hold,bodyweight}',       null, 'Tap opposite shoulder, resist rotation'),
('hollow-hold',                 'Hollow Body Hold',                 '{Core / Abs}',                     '{Hip Flexors}',                        '{core,hold,bodyweight}',       null, 'Lower back pressed to floor throughout'),
('dead-bug',                    'Dead Bug',                         '{Core / Abs}',                     '{Hip Flexors}',                        '{core,stability,bodyweight}',  null, 'Lower back flat, opposite arm and leg extend'),
('bird-dog',                    'Bird Dog',                         '{Core / Abs,Lower Back}',          '{Glutes}',                             '{core,stability,bodyweight}',  null, 'Extend opposite arm and leg, hips stay level'),
('pallof-press',                'Pallof Press',                     '{Core / Abs}',                     '{Front Deltoid}',                      '{core,stability,cable}',       null, 'Anti-rotation press — resist the cable pulling you'),
('cable-woodchop-high',         'Cable Woodchop — High to Low',     '{Core / Abs}',                     '{Front Deltoid,Latissimus Dorsi}',     '{core,compound,cable}',        null, 'Rotate and pull cable across body'),
('cable-woodchop-low',          'Cable Woodchop — Low to High',     '{Core / Abs}',                     '{Front Deltoid}',                      '{core,compound,cable}',        null, 'Rotate upward, opposite to standard chop'),
('russian-twist',               'Russian Twist',                    '{Core / Abs}',                     '{}',                                   '{core,iso,bodyweight}',        null, 'Rotate side to side, feet can be elevated'),
('weighted-russian-twist',      'Weighted Russian Twist',           '{Core / Abs}',                     '{}',                                   '{core,iso,dumbbell}',          null, 'Dumbbell or plate, controlled rotation'),
('suitcase-carry',              'Suitcase Carry',                   '{Core / Abs}',                     '{Trapezius}',                          '{core,compound,dumbbell}',     null, 'Single arm loaded carry, anti-lateral flexion'),
('farmers-carry',               'Farmer Carry',                     '{Core / Abs,Trapezius}',           '{Forearms}',                           '{core,compound,dumbbell}',     null, 'Heavy bilateral carry, posture and grip'),

-- ============================================================
-- FOREARMS
-- ============================================================

('wrist-curl',                  'Wrist Curl',                       '{Forearms}',                       '{}',                                   '{forearms,iso,barbell}',       null, 'Forearms on bench, curl up at wrist'),
('reverse-wrist-curl',          'Reverse Wrist Curl',               '{Forearms}',                       '{}',                                   '{forearms,iso,barbell}',       null, 'Overhand grip, extend the wrist'),
('db-wrist-curl',               'Dumbbell Wrist Curl',              '{Forearms}',                       '{}',                                   '{forearms,iso,dumbbell}',      null, 'Same as barbell version but unilateral'),
('plate-pinch',                 'Plate Pinch',                      '{Forearms}',                       '{}',                                   '{forearms,iso,barbell}',       null, 'Pinch two plates together, hold for time'),
('towel-pullup',                'Towel Pull-Up',                    '{Forearms,Latissimus Dorsi}',      '{}',                                   '{forearms,compound,bodyweight}', null, 'Towels over bar, extreme grip challenge'),

-- ============================================================
-- NECK
-- ============================================================

('neck-flexion',                'Neck Flexion',                     '{Neck}',                           '{}',                                   '{neck,iso,bodyweight}',        null, 'Chin to chest against resistance, controlled'),
('neck-extension',              'Neck Extension',                   '{Neck}',                           '{}',                                   '{neck,iso,bodyweight}',        null, 'Head back against resistance'),
('neck-lateral',                'Neck Lateral Flexion',             '{Neck}',                           '{}',                                   '{neck,iso,bodyweight}',        null, 'Ear to shoulder against hand resistance'),

-- ============================================================
-- FULL BODY / OLYMPIC
-- ============================================================

('power-clean',                 'Power Clean',                      '{Quadriceps,Glutes,Trapezius}',    '{Hamstrings,Lower Back,Calves}',       '{fullbody,compound,barbell}',  null, 'Explosive hip extension, catch in quarter squat'),
('hang-clean',                  'Hang Clean',                       '{Quadriceps,Glutes,Trapezius}',    '{Hamstrings}',                         '{fullbody,compound,barbell}',  null, 'Start from hang position at mid-thigh'),
('clean-and-jerk',              'Clean and Jerk',                   '{Quadriceps,Glutes,Trapezius}',    '{Hamstrings,Front Deltoid}',           '{fullbody,compound,barbell}',  null, 'Olympic lift — clean then jerk overhead'),
('snatch',                      'Snatch',                           '{Quadriceps,Glutes,Trapezius}',    '{Hamstrings,Front Deltoid}',           '{fullbody,compound,barbell}',  null, 'Wide grip, bar goes from floor to overhead in one motion'),
('kettlebell-swing',            'Kettlebell Swing',                 '{Glutes,Hamstrings}',              '{Lower Back,Core / Abs}',              '{fullbody,compound,bodyweight}', null, 'Hip hinge drive, not a squat, bell floats at shoulder height'),
('kettlebell-clean',            'Kettlebell Clean',                 '{Glutes,Trapezius}',               '{Core / Abs}',                         '{fullbody,compound,bodyweight}', null, 'Hip drive pulls KB to rack position'),
('thruster',                    'Thruster',                         '{Quadriceps,Glutes,Front Deltoid}','{Triceps,Core / Abs}',                 '{fullbody,compound,barbell}',  null, 'Front squat into push press in one fluid motion'),
('burpee',                      'Burpee',                           '{Quadriceps,Glutes,Upper Chest}',  '{Core / Abs,Triceps}',                 '{fullbody,compound,bodyweight}', null, 'Floor to jump, use for conditioning not just strength'),
('clean-pull',                  'Clean Pull',                       '{Quadriceps,Glutes,Trapezius}',    '{Hamstrings}',                         '{fullbody,compound,barbell}',  null, 'First two pulls of clean without catching'),

-- ============================================================
-- CARDIO / CONDITIONING
-- ============================================================

('rowing-machine',              'Rowing Machine',                   '{Latissimus Dorsi,Quadriceps}',    '{Biceps,Core / Abs,Glutes}',           '{cardio,fullbody,machine}',    null, 'Drive with legs first, then pull with back'),
('assault-bike',                'Assault Bike',                     '{Quadriceps,Upper Chest}',         '{Core / Abs,Shoulders}',               '{cardio,fullbody,machine}',    null, 'Full body conditioning, pacing is key'),
('sled-push',                   'Sled Push',                        '{Quadriceps,Glutes}',              '{Core / Abs,Front Deltoid}',           '{cardio,fullbody,machine}',    null, 'Drive forward, stay low'),
('sled-pull',                   'Sled Pull',                        '{Hamstrings,Glutes}',              '{Latissimus Dorsi}',                   '{cardio,fullbody,machine}',    null, 'Walk backwards, rope or harness'),
('battle-ropes',                'Battle Ropes',                     '{Front Deltoid,Lateral Deltoid}',  '{Core / Abs}',                         '{cardio,fullbody,bodyweight}', null, 'Alternate or simultaneous waves, keep core tight'),
('box-jump',                    'Box Jump',                         '{Quadriceps,Glutes}',              '{Calves,Core / Abs}',                  '{legs,quads,compound,bodyweight}', null, 'Land softly, step down do not jump down'),
('broad-jump',                  'Broad Jump',                       '{Quadriceps,Glutes}',              '{Hamstrings,Calves}',                  '{legs,quads,compound,bodyweight}', null, 'Max horizontal distance, absorb landing')

on conflict (slug) do nothing;
