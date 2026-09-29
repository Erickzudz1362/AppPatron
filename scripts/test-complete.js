const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'App.tsx',
  'index.ts',
  'src/context/AuthContext.tsx',
  'src/api/supabaseData.ts',
  'src/screens/staff/StaffBookingsScreen.tsx',
  'src/screens/staff/StaffBarbersScreen.tsx',
  'src/screens/notifications/NotificationsScreen.tsx',
  'scripts/test-supabase.js',
  'scripts/test-complete.js',
  'scripts/test-professional-core.js',
  'src/api/bookingApi.ts',
  'src/notifications/registration.ts',
  'supabase/professional_core_v1.sql',
  'supabase/professional_booking_changes_v2.sql',
  'supabase/email-templates/confirm-signup.html',
  'vercel.json',
];

const missing = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));

if (missing.length) {
  console.error(`Faltan archivos esperados:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

const authConfirmed = fs.readFileSync(path.join(root, 'public/auth-confirmed.html'), 'utf8');
if (!authConfirmed.includes('__SUPABASE_URL__') || !authConfirmed.includes('__SUPABASE_ANON_KEY__')) {
  console.error('auth-confirmed.html debe usar variables inyectadas durante el build, no credenciales versionadas.');
  process.exit(1);
}

console.log('Chequeo estructural del proyecto: OK');
