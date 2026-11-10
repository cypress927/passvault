import { concatBytes } from '../crypto/aead'
import type { BlobRef, Field, Item, Manifest, VaultData } from './model'

export function packContainer(manifest: Manifest, blobs: Map<string, Uint8Array>): Uint8Array {
  const orderedIds: string[] = []
  const seen = new Set<string>()
  for (const item of manifest.items) {
    for (const field of item.fields) {
      if (field.value.kind === 'file' && !seen.has(field.value.blobId)) {
        seen.add(field.value.blobId)
        orderedIds.push(field.value.blobId)
      }
    }
  }

  const refs: BlobRef[] = []
  const parts: Uint8Array[] = []
  let offset = 0
  for (const id of orderedIds) {
    const data = blobs.get(id)
    if (!data) {
      throw new Error(`缺少附件数据：${id}`)
    }
    refs.push({ id, offset, size: data.length })
    parts.push(data)
    offset += data.length
  }

  const stored: Manifest = { ...manifest, blobs: refs }
  const json = new TextEncoder().encode(JSON.stringify(stored))
  const head = new Uint8Array(4)
  new DataView(head.buffer).setUint32(0, json.length, false)
  return concatBytes(head, json, ...parts)
}

export function unpackContainer(plaintext: Uint8Array): VaultData {
  if (plaintext.length < 4) {
    throw new Error('数据已损坏：容器头不完整')
  }
  const manifestLen = new DataView(
    plaintext.buffer,
    plaintext.byteOffset,
    4,
  ).getUint32(0, false)
  if (4 + manifestLen > plaintext.length) {
    throw new Error('数据已损坏：manifest 长度异常')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext.subarray(4, 4 + manifestLen)))
  } catch {
    throw new Error('数据已损坏：manifest 不是有效 JSON')
  }
  const manifest = validateManifest(parsed)

  const region = plaintext.subarray(4 + manifestLen)
  const blobs = new Map<string, Uint8Array>()
  for (const ref of manifest.blobs) {
    if (
      !Number.isInteger(ref.offset) ||
      !Number.isInteger(ref.size) ||
      ref.offset < 0 ||
      ref.size < 0 ||
      ref.offset + ref.size > region.length
    ) {
      throw new Error('数据已损坏：附件区间越界')
    }
    blobs.set(ref.id, region.slice(ref.offset, ref.offset + ref.size))
  }

  for (const item of manifest.items) {
    for (const field of item.fields) {
      if (field.value.kind === 'file' && !blobs.has(field.value.blobId)) {
        throw new Error('数据已损坏：附件引用缺失')
      }
    }
  }

  return { manifest, blobs }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`数据已损坏：${field} 不是字符串`)
  }
  return value
}

function requireNonNegativeInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`数据已损坏：${field} 不是非负整数`)
  }
  return value
}

function validateManifest(value: unknown): Manifest {
  if (!isRecord(value)) {
    throw new Error('数据已损坏：manifest 结构异常')
  }
  if (value.formatVersion !== 1) {
    throw new Error('数据已损坏：manifest 版本异常')
  }
  const createdAt = requireString(value.createdAt, 'createdAt')
  const updatedAt = requireString(value.updatedAt, 'updatedAt')

  if (!Array.isArray(value.items)) {
    throw new Error('数据已损坏：items 不是数组')
  }
  const items = value.items.map((rawItem, index) => validateItem(rawItem, index))

  if (!Array.isArray(value.blobs)) {
    throw new Error('数据已损坏：blobs 不是数组')
  }
  const blobs: BlobRef[] = value.blobs.map((rawRef, index) => {
    if (!isRecord(rawRef)) {
      throw new Error(`数据已损坏：附件引用 ${index} 结构异常`)
    }
    return {
      id: requireString(rawRef.id, `blobs[${index}].id`),
      offset: requireNonNegativeInt(rawRef.offset, `blobs[${index}].offset`),
      size: requireNonNegativeInt(rawRef.size, `blobs[${index}].size`),
    }
  })

  return { formatVersion: 1, createdAt, updatedAt, items, blobs }
}

function validateItem(value: unknown, index: number): Item {
  if (!isRecord(value)) {
    throw new Error(`数据已损坏：条目 ${index} 结构异常`)
  }
  if (!Array.isArray(value.fields)) {
    throw new Error(`数据已损坏：条目 ${index} 的 fields 不是数组`)
  }
  return {
    id: requireString(value.id, `items[${index}].id`),
    name: requireString(value.name, `items[${index}].name`),
    description: requireString(value.description, `items[${index}].description`),
    fields: value.fields.map((rawField, fieldIndex) =>
      validateField(rawField, index, fieldIndex),
    ),
  }
}

function validateField(value: unknown, itemIndex: number, fieldIndex: number): Field {
  if (!isRecord(value) || !isRecord(value.value)) {
    throw new Error(`数据已损坏：条目 ${itemIndex} 的字段 ${fieldIndex} 结构异常`)
  }
  const key = requireString(value.key, `items[${itemIndex}].fields[${fieldIndex}].key`)
  const rawValue = value.value

  if (rawValue.kind === 'text') {
    return {
      key,
      value: {
        kind: 'text',
        text: requireString(rawValue.text, `items[${itemIndex}].fields[${fieldIndex}].text`),
      },
    }
  }
  if (rawValue.kind === 'file') {
    return {
      key,
      value: {
        kind: 'file',
        blobId: requireString(rawValue.blobId, `items[${itemIndex}].fields[${fieldIndex}].blobId`),
        filename: requireString(rawValue.filename, `items[${itemIndex}].fields[${fieldIndex}].filename`),
        mime: requireString(rawValue.mime, `items[${itemIndex}].fields[${fieldIndex}].mime`),
        size: requireNonNegativeInt(rawValue.size, `items[${itemIndex}].fields[${fieldIndex}].size`),
      },
    }
  }

  throw new Error(`数据已损坏：条目 ${itemIndex} 的字段 ${fieldIndex} 值类型异常`)
}
