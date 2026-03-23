-- ============================================================
-- Add onboarding_done flag to user_settings
-- Safe to re-run
-- ============================================================

alter table user_settings
  add column if not exists onboarding_done boolean not null default false;
