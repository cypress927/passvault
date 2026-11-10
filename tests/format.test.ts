import { describe, expect, it } from 'vitest'
import { HEADER_SIZE, parseHeader, serializeHeader, type Header } from '../src/vault/format'

function sampleHeader(): Header {
  return {
    formatVersion: 1,
    kdf: { memoryKiB: 65536, iterations: 3, parallelism: 1 },
    salt: Uint8Array.from({ length: 16 }, (_, i) => i),
    wrapIv: Uint8Array.from({ length: 12 }, (_, i) => 100 + i),
    wrappedDek: Uint8Array.from({ length: 48 }, (_, i) => 200 - i),
  }
}

describe('header format', () => {
  it('round-trips', () => {
    const header = sampleHeader()
    const bytes = serializeHeader(header)
    expect(bytes.length).toBe(HEADER_SIZE)
    expect(parseHeader(bytes)).toEqual(header)
  })

  it('rejects wrong magic', () => {
    const bytes = serializeHeader(sampleHeader())
    bytes[0] = 0
    expect(() => parseHeader(bytes)).toThrow('不是 passmgmt 数据文件')
  })

  it('rejects unknown versions', () => {
    const bytes = serializeHeader(sampleHeader())
    bytes[4] = 2
    expect(() => parseHeader(bytes)).toThrow('不支持的格式版本')
  })

  it('rejects short input', () => {
    expect(() => parseHeader(new Uint8Array(10))).toThrow('长度不足')
  })

  it('rejects a tampered header length', () => {
    const bytes = serializeHeader(sampleHeader())
    new DataView(bytes.buffer).setUint32(88, 90, false)
    expect(() => parseHeader(bytes)).toThrow('文件头长度异常')
  })

  it('rejects absurd KDF parameters', () => {
    const bytes = serializeHeader(sampleHeader())
    new DataView(bytes.buffer).setUint32(6, 0, false)
    expect(() => parseHeader(bytes)).toThrow('KDF 参数异常')
  })
})
