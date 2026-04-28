const fs = require('fs');
const path = require('path');

const root = process.cwd();
const envPath = path.join(root, '.env');
const requiredSqlFiles = [
  'supabase/create_notifications_table.sql',
  'supabase/create_notification_reads_table.sql',
  'supabase/critical_fixes_notifications_and_visits.sql',
  'supabase/functions/create-barber-user/index.ts',
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const relativePath of requiredSqlFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Falta el archivo requerido: ${relativePath}`);
  }
}

if (!fs.existsSync(envPath)) {
  fail('Falta el archivo .env para validar Supabase.');
}

const envText = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return idx >= 0 ? [line.slice(0, idx), line.slice(idx + 1)] : [line, ''];
    })
);

const url = String(env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const anonKey = String(env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!url || /TU_URL|localhost/i.test(url)) {
  fail('EXPO_PUBLIC_SUPABASE_URL no está configurada correctamente en .env.');
}

if (!anonKey || /TU_KEY/i.test(anonKey)) {
  fail('EXPO_PUBLIC_SUPABASE_ANON_KEY no está configurada correctamente en .env.');
}

console.log('Validación Supabase básica: OK');

