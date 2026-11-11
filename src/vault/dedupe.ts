import type { Field, Item } from './model'

export interface DuplicateGroup {
  id: string
  items: Item[]
}

/**
 * Metadata signature: everything except attachment bytes. Hints are editor
 * placeholders, not data, so they do not participate. Folder is a location,
 * not content, so it does not participate either.
 */
function fieldSignature(field: Field): unknown[] {
  const value = field.value
  if (value.kind === 'file') {
    return ['file', field.key, value.filename, value.mime, value.size, value.blobId === null]
  }
  return [value.kind, field.key, value.text]
}

function itemSignature(item: Item): string {
  return JSON.stringify([item.name, item.description, item.fields.map(fieldSignature)])
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }
  return true
}

function attachmentIds(item: Item): (string | null)[] {
  return item.fields.flatMap((field) =>
    field.value.kind === 'file' ? [field.value.blobId] : [],
  )
}

/** Same metadata signature; now compare the attachment bytes field by field. */
function sameContent(a: Item, b: Item, blobs: Map<string, Uint8Array>): boolean {
  const left = attachmentIds(a)
  const right = attachmentIds(b)
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const leftId = left[index]
    const rightId = right[index]
    if (leftId === null || rightId === null) {
      if (leftId !== rightId) return false
      continue
    }
    const leftBytes = blobs.get(leftId)
    const rightBytes = blobs.get(rightId)
    if (!leftBytes || !rightBytes) return false
    if (!bytesEqual(leftBytes, rightBytes)) return false
  }
  return true
}

/**
 * Groups items whose name, description and fields (key, type, value, file
 * name/mime/size, attachment bytes) are all equal. Field order must match.
 * Only groups with two or more items are returned, in vault order.
 */
export function findDuplicateGroups(
  items: Item[],
  blobs: Map<string, Uint8Array>,
): DuplicateGroup[] {
  const buckets = new Map<string, Item[]>()
  for (const item of items) {
    const signature = itemSignature(item)
    const bucket = buckets.get(signature)
    if (bucket) {
      bucket.push(item)
    } else {
      buckets.set(signature, [item])
    }
  }

  const groups: Item[][] = []
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue
    const split: Item[][] = []
    for (const item of bucket) {
      const same = split.find((group) => sameContent(group[0], item, blobs))
      if (same) {
        same.push(item)
      } else {
        split.push([item])
      }
    }
    for (const group of split) {
      if (group.length > 1) groups.push(group)
    }
  }

  return groups.map((group, index) => ({ id: `group-${index}`, items: group }))
}
