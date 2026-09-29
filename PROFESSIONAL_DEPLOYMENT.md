# Despliegue profesional de AppPatron

## Orden obligatorio

1. Crear un backup de la base productiva desde Supabase.
2. Probar, en este orden, `supabase/professional_core_v1.sql` y
   `supabase/professional_booking_changes_v2.sql` en staging con una copia de datos.
3. Ejecutar ambos archivos, en ese mismo orden, en producción y confirmar que cada uno termina con `COMMIT`.
4. Desplegar la Edge Function `send-booking-push` después de aplicar v2.
5. Configurar las claves VAPID en Supabase y la clave pública en el despliegue PWA.
6. Cargar las plantillas de `supabase/email-templates/` en Authentication > Email Templates.
7. Publicar la PWA y después generar la compilación nativa.

La aplicación nueva depende de las RPC `get_barber_availability`, `create_appointment`,
`get_public_barber_directory`, `update_appointment_status`, `get_client_history_v2`,
`cancel_my_appointment` y `reschedule_my_appointment`. El SQL debe desplegarse antes que
el frontend.

La cancelación y la reprogramación se validan en el servidor con un mínimo predeterminado
de 3 horas. Ese valor puede editarse desde Configuración del panel administrativo. No existe
tiempo de limpieza ni margen automático entre citas: la ocupación usa exactamente la suma de
las duraciones de los servicios seleccionados.

## Web Push para PWA

Generar un par VAPID una sola vez y guardar las claves de forma privada. Configurar en los
secrets de la Edge Function:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (por ejemplo `mailto:administracion@dominio.com`)

En Vercel/EAS configurar:

- `EXPO_PUBLIC_VAPID_PUBLIC_KEY` con la misma clave pública.

La clave privada nunca debe incluirse en `.env`, Git, Expo ni Vercel frontend.

## Validación posterior

- Dos clientes no pueden reservar horarios superpuestos.
- Una combinación de servicios bloquea la suma completa de sus duraciones.
- Una reserva cancelada libera el horario.
- Cliente no puede cancelar ni reprogramar dentro de las 3 horas anteriores a su cita.
- Una reprogramación conserva servicios, duración y barbero, y vuelve el estado a pendiente.
- El historial de auditoría registra creación, cambio de estado y reprogramación.
- Domingo cerrado y horarios personalizados coinciden con el panel del barbero.
- Cliente no puede modificar `profiles.role` ni `profiles.status`.
- Barbero solo puede cambiar reservas asignadas a él.
- Admin, barbero y cliente reciben el aviso correcto sin duplicados.
- PWA instalada recibe avisos incluso estando cerrada.
- Android/iOS reciben Expo Push después de activar la preferencia desde Perfil.
- Confirmación, recuperación, enlace mágico e invitación llegan con texto de El Patrón en español.

## Rendimiento esperado

- El perfil en caché abre sin esperar una validación de red.
- Inicio reutiliza caché durante dos minutos y consolida el directorio de barberos en una RPC.
- Panel de reservas evita cargas simultáneas y usa un refresco de respaldo cada cinco minutos.
- Los permisos push nunca bloquean el inicio.
- Carruseles y galería se comprimen antes de subirlos.

## Comandos de comprobación

```bash
npm run typecheck
npm run test:professional
npm run web:build
```

No medir rendimiento con Expo Go. Usar una APK/AAB `production` y la PWA desplegada.
