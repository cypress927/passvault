import type { KdfParams } from '../crypto/kdf'

export const MAGIC = 'PMV1'
export const FORMAT_VERSION = 1
export const HEADER_SIZE = 92

const SALT_OFFSET = 12
const WRAP_IV_OFFSET = 28
const WRAPPED_DEK_OFFSET = 40
const HEADER_LEN_OFFSET = 88

export interface Header {
  formatVersion: number
  kdf: KdfParams
  salt: Uint8Array
  wrapIv: Uint8Array
  wrappedDek: Uint8Array
}

export function serializeHeader(header: Header): Uint8Array {
  const out = new Uint8Array(HEADER_SIZE)
  const view = new DataView(out.buffer)
  out.set(new TextEncoder().encode(MAGIC), 0)
  out[4] = header.formatVersion
  out[5] = 1
  view.setUint32(6, header.kdf.memoryKiB, false)
  out[10] = header.kdf.iterations
  out[11] = header.kdf.parallelism
  out.set(header.salt, SALT_OFFSET)
  out.set(header.wrapIv, WRAP_IV_OFFSET)
  out.set(header.wrappedDek, WRAPPED_DEK_OFFSET)
  view.setUint32(HEADER_LEN_OFFSET, HEADER_SIZE, false)
  return out
}

export function parseHeader(bytes: Uint8Array): Header {
  if (bytes.length < HEADER_SIZE) {
    throw new Error('文件已损坏：长度不足')
  }

  const magic = new TextDecoder().decode(bytes.subarray(0, 4))
  if (magic !== MAGIC) {
    throw new Error('不是 passmgmt 数据文件')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, HEADER_SIZE)
  const formatVersion = bytes[4]
  if (formatVersion !== FORMAT_VERSION) {
    throw new Error(`不支持的格式版本：${formatVersion}`)
  }
  if (bytes[5] !== 1) {
    throw new Error(`不支持的 KDF 类型：${bytes[5]}`)
  }
  if (view.getUint32(HEADER_LEN_OFFSET, false) !== HEADER_SIZE) {
    throw new Error('文件已损坏：文件头长度异常')
  }

  const kdf: KdfParams = {
    memoryKiB: view.getUint32(6, false),
    iterations: bytes[10],
    parallelism: bytes[11],
  }
  if (
    kdf.memoryKiB < 8 ||
    kdf.memoryKiB > 1 << 20 ||
    kdf.iterations < 1 ||
    kdf.parallelism < 1
  ) {
    throw new Error('文件已损坏：KDF 参数异常')
  }

  return {
    formatVersion,
    kdf,
    salt: bytes.slice(SALT_OFFSET, SALT_OFFSET + 16),
    wrapIv: bytes.slice(WRAP_IV_OFFSET, WRAP_IV_OFFSET + 12),
    wrappedDek: bytes.slice(WRAPPED_DEK_OFFSET, WRAPPED_DEK_OFFSET + 48),
  }
}
