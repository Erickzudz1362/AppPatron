const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const migration = read('supabase/professional_core_v1.sql');
const bookingChanges = read('supabase/professional_booking_changes_v2.sql');
const calendar = read('src/screens/barbers/BarberCalendarScreen.tsx');
const summary = read('src/screens/barbers/BookingSummaryScreen.tsx');
const auth = read('src/context/AuthContext.tsx');
const edgePush = read('supabase/functions/send-booking-push/index.ts');
const worker = read('public/service-worker.js');

[
  'get_barber_availability',
  'get_public_barber_directory',
  'create_appointment',
  'update_appointment_status',
  'guard_profile_privileged_columns',
  'web_push_subscriptions',
].forEach((name) => assert(migration.includes(name), `Falta ${name} en la migración profesional.`));

assert(calendar.includes('getBarberAvailability'), 'El calendario debe usar disponibilidad segura.');
assert(!calendar.includes(".from('appointments')"), 'El cliente no debe leer appointments para calcular disponibilidad.');
assert(summary.includes('createAppointment({'), 'La reserva debe crearse mediante RPC atómica.');
assert(!summary.includes(".from('appointments').insert"), 'El cliente no debe insertar appointments directamente.');
assert(!auth.includes('syncPushTokenToProfile'), 'El inicio no debe solicitar permisos push automáticamente.');
assert(edgePush.includes('appointmentId'), 'Push debe validarse contra una reserva real.');
assert(edgePush.includes('web_push_subscriptions'), 'La función push debe incluir Web Push.');
[
  'cancel_my_appointment',
  'reschedule_my_appointment',
  'get_client_history_v2',
  'appointment_change_min_hours',
].forEach((name) => assert(bookingChanges.includes(name), `Falta ${name} en la migración v2.`));

assert(worker.includes("el-patron-pwa-v15"), 'Service worker sin versión profesional esperada.');
assert(worker.includes("fetch(event.request, { cache: 'no-store' })"), 'La navegación PWA debe priorizar la versión publicada más reciente.');
assert(!worker.includes('self.skipWaiting()'), 'El Service Worker no debe borrar la caché activa mientras una versión anterior sigue abierta.');

console.log('Núcleo profesional: OK');
