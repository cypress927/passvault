import { describe, expect, it } from 'vitest'
import { matchesQuery } from '../src/vault/search'
import type { Item } from '../src/vault/model'

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item',
    name: '邮箱',
    description: '个人邮箱',
    folderId: null,
    fields: [
      { key: '用户名', value: { kind: 'text', text: 'alice@example.com' } },
      { key: '照片', value: { kind: 'file', blobId: null, filename: 'avatar.png', mime: 'image/png', size: 0 } },
    ],
    ...overrides,
  }
}

describe('matchesQuery', () => {
  it('matches name, description, field key, text value and attachment name', () => {
    expect(matchesQuery(item(), '邮')).toBe(true)
    expect(matchesQuery(item(), '个人')).toBe(true)
    expect(matchesQuery(item(), '用户名')).toBe(true)
    expect(matchesQuery(item(), 'alice')).toBe(true)
    expect(matchesQuery(item(), 'avatar')).toBe(true)
  })

  it('is case-insensitive and ignores surrounding spaces', () => {
    expect(matchesQuery(item(), '  ALICE  ')).toBe(true)
  })

  it('returns true for an empty query', () => {
    expect(matchesQuery(item(), '   ')).toBe(true)
  })

  it('returns false when nothing matches', () => {
    expect(matchesQuery(item(), 'redis')).toBe(false)
  })
})
