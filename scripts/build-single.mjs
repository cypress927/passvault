import fs from 'node:fs'
import path from 'node:path'

const dir = 'dist-single'
const htmlPath = path.join(dir, 'index.html')

if (!fs.existsSync(htmlPath)) {
  throw new Error(`没有找到 ${htmlPath}，请先运行 vite build --mode single`)
}

const resolveAsset = (ref) => {
  if (ref.startsWith('data:') || ref.startsWith('http:') || ref.startsWith('https:')) {
    return null
  }
  return path.join(dir, ref.replace(/^\.?\//, ''))
}

let html = fs.readFileSync(htmlPath, 'utf8')

html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, (tag) => {
  const href = tag.match(/\bhref="([^"]+)"/)?.[1]
  if (!href) return tag
  const file = resolveAsset(href)
  if (!file) return tag
  const css = fs.readFileSync(file, 'utf8')
  return `<style>${css.replace(/<\/style/gi, '<\/style')}</style>`
})

html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
  const file = resolveAsset(src)
  if (!file) return tag
  const js = fs.readFileSync(file, 'utf8')
  return `<script type="module">${js.replace(/<\/script/gi, '<\/script')}</script>`
})

if (/<script\b[^>]*\bsrc=/.test(html) || /<link\b[^>]*\brel="stylesheet"/.test(html)) {
  throw new Error('仍有外部脚本或样式没有内联')
}

const out = path.join(dir, 'passmgmt.html')
fs.writeFileSync(out, html)
fs.rmSync(path.join(dir, 'assets'), { recursive: true, force: true })
fs.rmSync(htmlPath, { force: true })

const size = (fs.statSync(out).size / 1024).toFixed(1)
console.log(`wrote ${out} (${size} KB)`)
