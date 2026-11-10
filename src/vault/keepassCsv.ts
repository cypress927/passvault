import type { Field } from './model'

export type CsvFormat = 'keepassxc' | 'keepass1' | 'generic'

export interface ParsedCsvEntry {
  name: string
  description: string
  folderName: string | null
  fields: Field[]
}

export interface ParsedCsvImport {
  format: CsvFormat
  columns: string[]
  ignoredColumns: string[]
  folders: string[]
  entries: ParsedCsvEntry[]
}

type EscapeMode = 'doubled' | 'backslash'

const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)
const BACKSLASH = String.fromCharCode(92)

const COLUMN_ALIASES = {
  group: ['group', '分组', '组'],
  title: ['title', 'account', '标题', '名称'],
  username: ['username', 'login name', 'login', 'user name', '用户名', '账号'],
  password: ['password', '密码'],
  url: ['url', 'web site', 'website', '网址', '网站'],
  notes: ['notes', 'comments', 'comment', '备注', '注释'],
  totp: ['totp', 'otp', '验证码'],
}

const IGNORED_COLUMNS = new Set([
  'icon',
  'last modified',
  'created',
  'modified',
  'expires',
  'expiry',
  'uuid',
  'tags',
])

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

/** RFC 4180 style parser, plus KeePass 1.x backslash escaping. */
export function parseCsv(
  text: string,
  mode: EscapeMode,
  maxRows = Number.POSITIVE_INFINITY,
): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let index = 0

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  while (index < source.length) {
    const char = source[index]

    if (inQuotes) {
      if (char === '"') {
        if (mode === 'doubled' && source[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      if (mode === 'backslash' && char === BACKSLASH) {
        const next = source[index + 1]
        if (next === '"' || next === BACKSLASH) {
          field += next
          index += 2
          continue
        }
        field += char
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      index += 1
      continue
    }
    if (char === ',') {
      pushField()
      index += 1
      continue
    }
    if (char === CR) {
      if (source[index + 1] === LF) index += 1
      pushRow()
      index += 1
      if (rows.length >= maxRows) break
      continue
    }
    if (char === LF) {
      pushRow()
      index += 1
      if (rows.length >= maxRows) break
      continue
    }
    field += char
    index += 1
  }

  if (inQuotes) {
    throw new Error('CSV 引号未闭合')
  }
  if (rows.length < maxRows && (field.length > 0 || row.length > 0)) {
    pushRow()
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

function detectFormat(headers: string[]): CsvFormat {
  const normalized = headers.map(normalizeHeader)
  if (normalized.includes('group') || normalized.includes('totp')) {
    return 'keepassxc'
  }
  if (
    normalized.includes('account') ||
    normalized.includes('login name') ||
    normalized.includes('web site')
  ) {
    return 'keepass1'
  }
  return 'generic'
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)))
}

interface ColumnMap {
  group: number
  title: number
  username: number
  password: number
  url: number
  notes: number
  totp: number
  ignored: number[]
  extras: Array<{ index: number; name: string }>
}

function buildColumnMap(headers: string[]): ColumnMap {
  const known = new Set<number>()
  const take = (aliases: string[]) => {
    const index = findColumn(headers, aliases)
    if (index >= 0) known.add(index)
    return index
  }

  const map: ColumnMap = {
    group: take(COLUMN_ALIASES.group),
    title: take(COLUMN_ALIASES.title),
    username: take(COLUMN_ALIASES.username),
    password: take(COLUMN_ALIASES.password),
    url: take(COLUMN_ALIASES.url),
    notes: take(COLUMN_ALIASES.notes),
    totp: take(COLUMN_ALIASES.totp),
    ignored: [],
    extras: [],
  }

  headers.forEach((header, index) => {
    if (known.has(index)) return
    const normalized = normalizeHeader(header)
    if (IGNORED_COLUMNS.has(normalized)) {
      map.ignored.push(index)
      return
    }
    if (normalized !== '') {
      map.extras.push({ index, name: header.trim() })
    }
  })

  return map
}

export function parseKeepassCsv(text: string): ParsedCsvImport {
  const headerRows = parseCsv(text, 'doubled', 1)
  if (headerRows.length === 0) {
    throw new Error('CSV 是空的')
  }

  const format = detectFormat(headerRows[0])
  const rows =
    format === 'keepass1' ? parseCsv(text, 'backslash') : parseCsv(text, 'doubled')

  const columns = rows[0].map((header) => header.trim())
  const map = buildColumnMap(columns)
  if (map.title < 0) {
    throw new Error('无法识别的 CSV：找不到标题列（Title / Account）')
  }

  const folders: string[] = []
  const seenFolders = new Set<string>()
  const entries: ParsedCsvEntry[] = []
  const cell = (row: string[], index: number) => (index >= 0 ? (row[index] ?? '') : '')

  for (const row of rows.slice(1)) {
    const name = cell(row, map.title)
    const description = cell(row, map.notes)
    const group = cell(row, map.group).trim()
    const fields: Field[] = []

    const addField = (key: string, value: string, kind: 'text' | 'password' | 'totp' = 'text') => {
      if (value !== '') {
        fields.push({ key, value: { kind, text: value } })
      }
    }

    addField('用户名', cell(row, map.username))
    addField('密码', cell(row, map.password), 'password')
    addField('网址', cell(row, map.url))
    addField('TOTP 密钥', cell(row, map.totp), 'totp')
    for (const extra of map.extras) {
      addField(extra.name, cell(row, extra.index))
    }

    if (name === '' && description === '' && fields.length === 0) {
      continue
    }

    if (group !== '' && !seenFolders.has(group)) {
      seenFolders.add(group)
      folders.push(group)
    }

    entries.push({
      name,
      description,
      folderName: group === '' ? null : group,
      fields,
    })
  }

  return {
    format,
    columns,
    ignoredColumns: map.ignored.map((index) => columns[index]),
    folders,
    entries,
  }
}
