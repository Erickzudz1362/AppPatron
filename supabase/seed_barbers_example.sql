-- Seed de ejemplo para barberos (esquema actual).
-- Requiere que existan usuarios en `profiles` con role = 'barber' (o 'admin').
-- Si no tienes perfiles barber aún, primero marca algunos usuarios:
--   update public.profiles set role = 'barber' where id = 'UUID_DEL_USUARIO';

with candidates as (
  select
    p.id as user_id,
    row_number() over (order by p.created_at nulls last, p.id) as rn
  from public.profiles p
  where p.role in ('barber', 'admin')
  limit 3
),
prepared as (
  select
    gen_random_uuid() as id,
    c.user_id,
    case c.rn
      when 1 then array['Corte','Barba','Afeitado']::text[]
      when 2 then array['Corte','Afeitado','Cejas']::text[]
      else array['Corte','Barba']::text[]
    end as specialties,
    true as active,
    case c.rn
      when 1 then '59170000001'
      when 2 then '59170000002'
      else '59170000003'
    end as whatsapp,
    '{"mon":{"start":"10:00","end":"20:00"},"tue":{"start":"10:00","end":"20:00"},"wed":{"start":"10:00","end":"20:00"},"thu":{"start":"10:00","end":"20:00"},"fri":{"start":"10:00","end":"20:00"},"sat":{"start":"10:00","end":"18:00"}}'::jsonb as base_schedule
  from candidates c
)
insert into public.barbers (id, user_id, specialties, active, whatsapp, base_schedule)
select p.id, p.user_id, p.specialties, p.active, p.whatsapp, p.base_schedule
from prepared p
where not exists (
  select 1 from public.barbers b where b.user_id = p.user_id
);

