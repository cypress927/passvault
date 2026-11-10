import { describe, expect, it } from 'vitest'
import { parseKeepassCsv } from '../src/vault/keepassCsv'

const LF = String.fromCharCode(10)
const CRLF = String.fromCharCode(13, 10)
const BACKSLASH = String.fromCharCode(92)
const BOM = String.fromCharCode(0xfeff)

describe('KeePassXC CSV', () => {
  const csv =
    BOM +
    [
      '"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"',
      '"Root/工作","公司 OA","zhangsan","p@ss,word","https://oa.example.com","第一行' +
        LF +
        '第二行","otpauth://totp/x","0","2026-01-01T00:00:00Z","2025-01-01T00:00:00Z"',
      '"Root/邮箱","主邮箱","me@example.com","pa""ss","https://mail.example.com","","","2","",""',
    ].join(CRLF)

  it('detects the format, folders and entries', () => {
    const parsed = parseKeepassCsv(csv)
    expect(parsed.format).toBe('keepassxc')
    expect(parsed.folders).toEqual(['Root/工作', 'Root/邮箱'])
    expect(parsed.entries).toHaveLength(2)
    expect(parsed.ignoredColumns).toEqual(['Icon', 'Last Modified', 'Created'])
  })

  it('maps fields, quoted commas, doubled quotes and multiline notes', () => {
    const parsed = parseKeepassCsv(csv)
    const [first, second] = parsed.entries
    expect(first.name).toBe('公司 OA')
    expect(first.folderName).toBe('Root/工作')
    expect(first.description).toBe(['第一行', '第二行'].join(LF))
    expect(first.fields.map((field) => field.key)).toEqual([
      '用户名',
      '密码',
      '网址',
      'TOTP 密钥',
    ])
    expect(first.fields[1].value).toEqual({ kind: 'text', text: 'p@ss,word' })
    expect(second.fields[1].value).toEqual({ kind: 'text', text: 'pa"ss' })
  })

  it('skips empty cells instead of creating empty fields', () => {
    const parsed = parseKeepassCsv(csv)
    const second = parsed.entries[1]
    expect(second.fields.map((field) => field.key)).toEqual(['用户名', '密码', '网址'])
  })
})

describe('KeePass 1.x CSV', () => {
  const csv = [
    '"Account","Login Name","Password","Web Site","Comments"',
    '"路由器","admin","p' +
      BACKSLASH +
      '"a' +
      BACKSLASH +
      BACKSLASH +
      'ss","http://192.168.1.1","备注"',
  ].join(LF)

  it('detects the format and decodes backslash escapes', () => {
    const parsed = parseKeepassCsv(csv)
    expect(parsed.format).toBe('keepass1')
    expect(parsed.folders).toEqual([])
    expect(parsed.entries).toHaveLength(1)
    const entry = parsed.entries[0]
    expect(entry.name).toBe('路由器')
    expect(entry.folderName).toBeNull()
    expect(entry.description).toBe('备注')
    expect(entry.fields[0].value).toEqual({ kind: 'text', text: 'admin' })
    expect(entry.fields[1].value).toEqual({
      kind: 'text',
      text: 'p"a' + BACKSLASH + 'ss',
    })
  })
})

describe('generic CSV', () => {
  it('maps unknown columns to extra fields and ignores metadata columns', () => {
    const csv = [
      '"Title","Username","Password","额外字段","Icon"',
      '"条目","user","","保留的值","0"',
    ].join(LF)
    const parsed = parseKeepassCsv(csv)
    expect(parsed.format).toBe('generic')
    expect(parsed.ignoredColumns).toEqual(['Icon'])
    expect(parsed.entries[0].fields.map((field) => field.key)).toEqual([
      '用户名',
      '额外字段',
    ])
  })

  it('rejects a header without a title column', () => {
    expect(() => parseKeepassCsv('"foo","bar"' + LF + '"1","2"')).toThrow(
      '找不到标题列',
    )
  })
})

describe('malformed input', () => {
  it('rejects an empty file', () => {
    expect(() => parseKeepassCsv('')).toThrow('CSV 是空的')
  })

  it('rejects unterminated quotes', () => {
    expect(() =>
      parseKeepassCsv('"Title","Username"' + LF + '"abc,"def"'),
    ).toThrow('引号未闭合')
  })
})
