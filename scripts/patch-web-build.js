const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist-web');
const indexPath = path.join(distDir, 'index.html');
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
  throw new Error('No se encontro dist-web/index.html. Ejecuta primero expo export.');
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

const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/service-worker.js').catch(function () {});
      });
    }
  </script>`;

if (!html.includes("serviceWorker.register('/service-worker.js')")) {
  html = html.replace('</body>', `${swScript}\n</body>`);
}

fs.writeFileSync(indexPath, html);
console.log('PWA metadata applied to dist-web/index.html');
