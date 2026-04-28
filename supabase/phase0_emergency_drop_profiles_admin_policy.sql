-- =============================================================================
-- ARREGLO MÍNIMO — Si ves "infinite recursion" en profiles siendo CLIENTE:
-- La política profiles_select_admin + is_admin() provoca bucle en Postgres.
-- Ejecuta esto en Supabase → SQL Editor (una sola vez).
-- =============================================================================

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- Opcional: confirma que existen estas tres (si falta alguna, ejecuta phase0_fix_rls_recursion.sql completo)
-- - profiles_select_own
-- - profiles_update_own
-- - profiles_insert_own_client
