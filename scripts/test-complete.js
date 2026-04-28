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
];

const missing = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));

if (missing.length) {
  console.error(`Faltan archivos esperados:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

console.log('Chequeo estructural del proyecto: OK');
