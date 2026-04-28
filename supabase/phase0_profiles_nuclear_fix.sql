-- =============================================================================
-- ARREGLO DEFINITIVO — "infinite recursion" en public.profiles
--
-- 1) Borra TODAS las políticas RLS de public.profiles (nombres que no conoces).
-- 2) Recrea solo 3 políticas seguras (sin is_admin ni EXISTS sobre profiles).
-- 3) is_admin() debe ser propietario = dueño de la tabla profiles para que la
--    lectura interna NO dispare RLS en bucle (comportamiento de Postgres).
--
-- Ejecuta TODO en Supabase → SQL Editor del MISMO proyecto que usa la app
-- (revisa EXPO_PUBLIC_SUPABASE_URL en .env).
-- =============================================================================

-- --- A) Quitar TODAS las políticas existentes en public.profiles ---
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- --- B) Políticas mínimas (solo tu fila; insert solo como client) ---
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own_client"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'client');

-- --- C) is_admin(): mismo dueño que la tabla profiles → lectura sin RLS en bucle ---
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.role = 'admin' FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

DO $$
DECLARE
  owner_name text;
BEGIN
  SELECT r.rolname INTO STRICT owner_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles r ON r.oid = c.relowner
  WHERE n.nspname = 'public'
    AND c.relname = 'profiles'
    AND c.relkind = 'r';

  EXECUTE format('ALTER FUNCTION public.is_admin() OWNER TO %I', owner_name);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'No se encontró public.profiles';
END $$;
