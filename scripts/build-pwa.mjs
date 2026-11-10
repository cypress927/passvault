import fs from 'node:fs'
import path from 'node:path'

const dir = 'dist-pwa'
const htmlPath = path.join(dir, 'index.html')

if (!fs.existsSync(htmlPath)) {
  throw new Error(`没有找到 ${htmlPath}，请先运行 vite build --mode pwa`)
}

let html = fs.readFileSync(htmlPath, 'utf8')

const assets = new Set()
for (const match of html.matchAll(/(?:src|href)="((?:\.\/|\/)assets\/[^"]+)"/g)) {
  assets.add('./' + match[1].replace(/^\.?\//, ''))
}

const assetsDir = path.join(dir, 'assets')
if (fs.existsSync(assetsDir)) {
  for (const file of fs.readdirSync(assetsDir)) {
    if (fs.statSync(path.join(assetsDir, file)).isFile()) {
      assets.add('./assets/' + file)
    }
  }
}

const core = [
  './',
  './index.html',
  './manifest.json',
  './register-sw.js',
  ...Array.from(assets),
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
]

const sw = fs
  .readFileSync('pwa/sw.js', 'utf8')
  .replace('__BUILD_ID__', String(Date.now()))
  .replace('__CORE_ASSETS__', JSON.stringify(core))
fs.writeFileSync(path.join(dir, 'sw.js'), sw)

fs.copyFileSync('pwa/register-sw.js', path.join(dir, 'register-sw.js'))
fs.copyFileSync('pwa/manifest.json', path.join(dir, 'manifest.json'))
fs.mkdirSync(path.join(dir, 'icons'), { recursive: true })
for (const file of fs.readdirSync('pwa/icons')) {
  fs.copyFileSync(path.join('pwa/icons', file), path.join(dir, 'icons', file))
}

const head = `
  <link rel="manifest" href="manifest.json" />
  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="passmgmt" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0e1116" media="(prefers-color-scheme: dark)" />`

html = html.replace('</head>', `${head}\n</head>`)
html = html.replace('</body>', '  <script src="register-sw.js" defer></script>\n</body>')
fs.writeFileSync(htmlPath, html)

console.log(`PWA built in ${dir} (${core.length} cached assets)`)
