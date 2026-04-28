-- =============================================================================
-- FASE 0 — Ejecutar en Supabase → SQL Editor (puedes por bloques si algo falla)
-- Revisa nombres de FK si ya existen; ajusta políticas a tu negocio.
-- =============================================================================

-- --- Índices (consultas más rápidas) ---
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON public.appointments (barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (date);
CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON public.barbers (user_id);
CREATE INDEX IF NOT EXISTS idx_availability_barber_id ON public.availability_blocks (barber_id);

-- --- Trigger: al registrarse en auth.users → fila en profiles (rol client) ---
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, phone)
  VALUES (
    NEW.id,
    'client',
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- --- RLS: activar en tablas ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;

-- Evita recursión infinita en RLS: no usar EXISTS (SELECT ... FROM profiles) dentro
-- de políticas sobre `profiles`; usar esta función SECURITY DEFINER.
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

-- --- Eliminar políticas previas con el mismo nombre (re-ejecutar script) ---
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_client" ON public.profiles;
-- Nota: NO recrear profiles_select_admin con is_admin(): al leer profiles dentro de
-- is_admin() se vuelve a evaluar RLS sobre profiles → recursión infinita.
-- El admin solo ve su fila como cualquier usuario; gestión global vía Dashboard/service_role.

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

-- --- profiles ---
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Solo puede insertar su propia fila como client (evita auto-promoción a admin/barber)
CREATE POLICY "profiles_insert_own_client"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'client');

-- --- services (catálogo: todos los autenticados ven activos; admin gestiona todo) ---
CREATE POLICY "services_select_active"
  ON public.services FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "services_all_admin"
  ON public.services FOR ALL
  TO authenticated
  USING (public.is_admin());

-- --- barberos (lectura de activos; el barbero actualiza el suyo; admin todo) ---
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

-- --- citas: cliente ve las suyas; barbero las de su fila; admin todas ---
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

-- --- bloques de disponibilidad: lectura para autenticados; escritura barbero propio o admin ---
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
