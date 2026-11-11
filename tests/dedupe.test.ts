import { describe, expect, it } from 'vitest'
import { findDuplicateGroups } from '../src/vault/dedupe'
import type { Field, Item } from '../src/vault/model'

function item(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    name: '邮箱',
    description: '工作邮箱',
    folderId: null,
    fields: [
      { key: '账号', value: { kind: 'text', text: 'a@example.com' } },
      { key: '密码', value: { kind: 'password', text: 'secret' } },
    ],
    ...overrides,
  }
}

function fileField(key: string, blobId: string | null, filename = 'photo.png'): Field {
  return {
    key,
    value: {
      kind: 'file',
      blobId,
      filename,
      mime: 'image/png',
      size: blobId ? 3 : 0,
    },
  }
}

function blobs(...entries: [string, number[]][]): Map<string, Uint8Array> {
  return new Map(entries.map(([id, bytes]) => [id, new Uint8Array(bytes)]))
}

describe('findDuplicateGroups', () => {
  it('groups items with identical content even when folders differ', () => {
    const groups = findDuplicateGroups(
      [item('a', { folderId: 'f1' }), item('b', { folderId: null }), item('c', { name: '其他' })],
      new Map(),
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('keeps vault order and numbers groups in order of first appearance', () => {
    const groups = findDuplicateGroups(
      [
        item('a', { name: '甲' }),
        item('b', { name: '乙' }),
        item('c', { name: '甲' }),
        item('d', { name: '乙' }),
      ],
      new Map(),
    )
    expect(groups.map((group) => group.items.map((entry) => entry.id))).toEqual([
      ['a', 'c'],
      ['b', 'd'],
    ])
    expect(groups.map((group) => group.id)).toEqual(['group-0', 'group-1'])
  })

  it('does not merge items that differ in name, description or field values', () => {
    const groups = findDuplicateGroups(
      [
        item('a'),
        item('b', { description: '个人邮箱' }),
        item('c', { name: '邮箱2' }),
        item('d', { fields: [
          { key: '账号', value: { kind: 'text', text: 'a@example.com' } },
          { key: '密码', value: { kind: 'password', text: 'other' } },
        ] }),
      ],
      new Map(),
    )
    expect(groups).toEqual([])
  })

  it('does not merge items whose fields are only reordered', () => {
    const groups = findDuplicateGroups(
      [
        item('a'),
        item('b', {
          fields: [
            { key: '密码', value: { kind: 'password', text: 'secret' } },
            { key: '账号', value: { kind: 'text', text: 'a@example.com' } },
          ],
        }),
      ],
      new Map(),
    )
    expect(groups).toEqual([])
  })

  it('merges attachments with equal bytes even when blob ids differ', () => {
    const groups = findDuplicateGroups(
      [
        item('a', { fields: [fileField('照片', 'blob-1')] }),
        item('b', { fields: [fileField('照片', 'blob-2')] }),
      ],
      blobs(['blob-1', [1, 2, 3]], ['blob-2', [1, 2, 3]]),
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(2)
  })

  it('does not merge attachments with different bytes', () => {
    const groups = findDuplicateGroups(
      [
        item('a', { fields: [fileField('照片', 'blob-1')] }),
        item('b', { fields: [fileField('照片', 'blob-2')] }),
      ],
      blobs(['blob-1', [1, 2, 3]], ['blob-2', [1, 2, 4]]),
    )
    expect(groups).toEqual([])
  })

  it('merges empty file fields', () => {
    const groups = findDuplicateGroups(
      [
        item('a', { fields: [fileField('照片', null)] }),
        item('b', { fields: [fileField('照片', null)] }),
      ],
      new Map(),
    )
    expect(groups).toHaveLength(1)
  })

  it('does not merge an empty file field with a filled one', () => {
    const groups = findDuplicateGroups(
      [
        item('a', { fields: [fileField('照片', null)] }),
        item('b', { fields: [fileField('照片', 'blob-1')] }),
      ],
      blobs(['blob-1', [1, 2, 3]]),
    )
    expect(groups).toEqual([])
  })

  it('ignores hints because they are editor placeholders', () => {
    const groups = findDuplicateGroups(
      [
        item('a'),
        item('b', { fields: [
          { key: '账号', hint: '手机号或邮箱', value: { kind: 'text', text: 'a@example.com' } },
          { key: '密码', value: { kind: 'password', text: 'secret' } },
        ] }),
      ],
      new Map(),
    )
    expect(groups).toHaveLength(1)
  })

  it('returns no groups for unique items', () => {
    expect(findDuplicateGroups([item('a')], new Map())).toEqual([])
    expect(findDuplicateGroups([], new Map())).toEqual([])
  })
})
