-- Si ya aplicaste phase0_fix_rls_recursion.sql antes de existir la política de INSERT,
-- ejecuta solo esto en Supabase → SQL Editor.
DROP POLICY IF EXISTS "profiles_insert_own_client" ON public.profiles;

CREATE POLICY "profiles_insert_own_client"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'client');
