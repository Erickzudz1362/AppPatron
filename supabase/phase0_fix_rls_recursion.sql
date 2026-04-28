-- =============================================================================
-- ARREGLA: "infinite recursion detected in policy for relation profiles"
-- Causa: políticas que leen `profiles` dentro de políticas sobre `profiles` (o
--        subconsultas a `profiles` que re-disparan RLS).
-- Solución histórica: is_admin() + profiles_select_admin → al leer `profiles` dentro
-- de is_admin() se re-evalúan las políticas de `profiles` (incl. admin) → RECURSIÓN.
-- Políticas en profiles: solo la propia fila (select/update/insert client). is_admin()
-- sigue usándose en OTRAS tablas; al consultar profiles solo aplica profiles_select_own.
-- Ejecuta TODO este archivo en Supabase → SQL Editor.
-- =============================================================================

-- Función auxiliar: ¿el usuario actual es admin? (no recursiva con RLS)
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

-- --- Quitar políticas que causan recursión / referencia directa a profiles en subqueries ---
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_client" ON public.profiles;

DROP POLICY IF EXISTS "services_select_active" ON public.services;
DROP POLICY IF EXISTS "services_all_admin" ON public.services;

DROP POLICY IF EXISTS "barbers_select_active" ON public.barbers;
DROP POLICY IF EXISTS "barbers_select_own" ON public.barbers;
DROP POLICY IF EXISTS "barbers_update_own" ON public.barbers;
DROP POLICY IF EXISTS "barbers_all_admin" ON public.barbers;

DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_client" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;

DROP POLICY IF EXISTS "availability_select" ON public.availability_blocks;
DROP POLICY IF EXISTS "availability_write" ON public.availability_blocks;

-- --- profiles (sin EXISTS sobre profiles en la misma tabla) ---
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own_client"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'client');

-- --- services ---
CREATE POLICY "services_select_active"
  ON public.services FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "services_all_admin"
  ON public.services FOR ALL
  TO authenticated
  USING (public.is_admin());

-- --- barbers ---
CREATE POLICY "barbers_select_active"
  ON public.barbers FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "barbers_select_own"
  ON public.barbers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "barbers_update_own"
  ON public.barbers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "barbers_all_admin"
  ON public.barbers FOR ALL
  TO authenticated
  USING (public.is_admin());

-- --- appointments ---
CREATE POLICY "appointments_select"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = appointments.barber_id AND b.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "appointments_insert_client"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "appointments_update"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = appointments.barber_id AND b.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- --- availability_blocks ---
CREATE POLICY "availability_select"
  ON public.availability_blocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "availability_write"
  ON public.availability_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = availability_blocks.barber_id AND b.user_id = auth.uid()
    )
    OR public.is_admin()
  );
