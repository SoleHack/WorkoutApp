-- ============================================================
-- MISSING CORE EXERCISES
-- Run in Supabase SQL Editor — safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================================

insert into exercises (slug, name, muscles, secondary_muscles, tags, video_url, notes) values

('flutter-kick',          'Flutter Kicks',           '{Core / Abs,Hip Flexors}', '{}',           '{core,iso,bodyweight}',  null, 'Legs straight, small alternating kicks — keep lower back flat'),
('single-leg-drop',       'Single Leg Drop',         '{Core / Abs,Hip Flexors}', '{}',           '{core,iso,bodyweight}',  null, 'One leg at a time lowered toward floor, lower back stays pressed down'),
('hip-raise',             'Hip Raise',               '{Core / Abs,Hip Flexors}', '{Glutes}',     '{core,iso,bodyweight}',  null, 'Lying flat, drive hips straight up toward ceiling — lower abs focus'),
('oblique-crunch',        'Oblique Crunch',          '{Core / Abs}',             '{}',           '{core,iso,bodyweight}',  null, 'Elbow toward opposite knee, rotate through the obliques'),
('plank-leg-raise',       'Plank Leg Raise',         '{Core / Abs,Glutes}',      '{Lower Back}', '{core,hold,bodyweight}', null, 'Hold plank position, lift one leg at a time — squeeze glute at top'),
('lying-toe-touch',       'Lying Toe Touch',         '{Core / Abs}',             '{}',           '{core,iso,bodyweight}',  null, 'Legs vertical, reach hands up toward toes — upper abs emphasis'),
('air-twisting-crunch',   'Air Twisting Crunch',     '{Core / Abs}',             '{}',           '{core,iso,bodyweight}',  null, 'Bicycle-style crunch with rotation — elbow meets opposite knee')

on conflict (slug) do nothing;
