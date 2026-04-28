-- Elimina "Combo" de specialties en todos los barberos.
-- Útil para alinear backend con la app (ya sin combos).

update public.barbers
set specialties = array_remove(specialties, 'Combo')
where specialties @> array['Combo']::text[];

