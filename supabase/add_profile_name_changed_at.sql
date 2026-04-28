-- Ejecutar en Supabase → SQL Editor (una vez).
-- Permite aplicar la regla "cambio de nombre como máximo cada 30 días".

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_changed_at timestamptz;

COMMENT ON COLUMN public.profiles.name_changed_at IS
  'Última vez que el usuario cambió el nombre desde la app.';
