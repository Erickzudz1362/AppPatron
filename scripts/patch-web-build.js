const fs = require('fs');
const path = require('path');

const outputDirectory = process.argv[2] || 'dist-web';
const distDir = path.resolve(__dirname, '..', outputDirectory);
const indexPath = path.join(distDir, 'index.html');
const authConfirmedPath = path.join(distDir, 'auth-confirmed.html');
const sourceFeatherFont = path.resolve(
  __dirname,
  '..',
  'public',
  'fonts',
  'Feather.ttf'
);
const distFontsDir = path.join(distDir, 'fonts');
const distFeatherFont = path.join(distFontsDir, 'Feather.ttf');

if (!fs.existsSync(indexPath)) {
  throw new Error(`No se encontro ${outputDirectory}/index.html. Ejecuta primero expo export.`);
}

fs.mkdirSync(distFontsDir, { recursive: true });
fs.copyFileSync(sourceFeatherFont, distFeatherFont);

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace('<html lang="en">', '<html lang="es">');
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />'
);

const pwaHead = [
  '<style id="el-patron-icon-font">@font-face{font-family:feather;src:url("/fonts/Feather.ttf") format("truetype");font-display:block;}@font-face{font-family:Feather;src:url("/fonts/Feather.ttf") format("truetype");font-display:block;}[style*="font-family: feather"],[style*="font-family:feather"],[style*="fontFamily: feather"]{font-family:feather!important;line-height:1!important;vertical-align:middle!important;-webkit-font-smoothing:antialiased;}</style>',
  '<style id="el-patron-web-polish">*{-webkit-tap-highlight-color:transparent;}input,textarea,[contenteditable="true"]{box-shadow:none!important;}input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:2px solid #08b9c7!important;outline-offset:2px;}</style>',
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<meta name="theme-color" content="#08b9c7" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="El Patron" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
].join('\n    ');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `    ${pwaHead}\n  </head>`);
}

fs.writeFileSync(indexPath, html);

if (fs.existsSync(authConfirmedPath)) {
  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseAnonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (process.env.VERCEL && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en Vercel.');
  }
  if (supabaseUrl && supabaseAnonKey) {
    const escapeForSingleQuotedJs = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const authHtml = fs.readFileSync(authConfirmedPath, 'utf8')
      .replace('__SUPABASE_URL__', escapeForSingleQuotedJs(supabaseUrl))
      .replace('__SUPABASE_ANON_KEY__', escapeForSingleQuotedJs(supabaseAnonKey));
    fs.writeFileSync(authConfirmedPath, authHtml);
  } else {
    console.warn('Auth recovery config was not injected because local Supabase env vars are absent.');
  }
}
console.log(`PWA metadata applied to ${outputDirectory}/index.html`);
