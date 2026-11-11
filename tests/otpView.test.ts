import { describe, expect, it } from 'vitest'
import { itemsWithTotp, usernameOf } from '../src/vault/otpView'
import type { Field, Item } from '../src/vault/model'

function item(fields: Field[], name = '账号'): Item {
  return { id: 'item', name, description: '', folderId: null, fields }
}

const text = (key: string, value: string): Field => ({
  key,
  value: { kind: 'text', text: value },
})
const totp = (key: string, value = 'JBSWY3DPEHPK3PXP'): Field => ({
  key,
  value: { kind: 'totp', text: value },
})
const password = (key: string, value: string): Field => ({
  key,
  value: { kind: 'password', text: value },
})

describe('usernameOf', () => {
  it('takes the 用户名 field', () => {
    expect(usernameOf(item([text('用户名', 'alice'), text('账号', 'bob')]))).toBe('alice')
  })

  it('falls back through the documented key list in order', () => {
    expect(usernameOf(item([text('登录平台', 'QQ'), text('账号', 'bob')]))).toBe('bob')
    expect(usernameOf(item([text('邮箱地址', 'a@example.com')]))).toBe('a@example.com')
    expect(usernameOf(item([text('手机号', '13800000000')]))).toBe('13800000000')
  })

  it('matches English keys case-insensitively', () => {
    expect(usernameOf(item([text('Username', 'carol')]))).toBe('carol')
    expect(usernameOf(item([text('EMAIL', 'carol@example.com')]))).toBe('carol@example.com')
  })

  it('skips empty values and non-text fields', () => {
    expect(
      usernameOf(item([text('用户名', '   '), password('账号', 'secret'), text('邮箱', 'x')])),
    ).toBe('')
    expect(usernameOf(item([text('用户名', ''), text('用户名', 'dave')]))).toBe('dave')
  })

  it('does not guess from other field names', () => {
    expect(usernameOf(item([text('登录平台', 'QQ'), text('绑定微信', 'wx-id')]))).toBe('')
  })
})

describe('itemsWithTotp', () => {
  it('keeps only items with a totp field, in order', () => {
    const withTotp = { ...item([totp('TOTP 密钥')]), id: 'a' }
    const without = { ...item([text('用户名', 'alice')]), id: 'b' }
    const emptySecret = { ...item([totp('TOTP 密钥', '')]), id: 'c' }
    expect(itemsWithTotp([withTotp, without, emptySecret]).map((entry) => entry.id)).toEqual([
      'a',
      'c',
    ])
  })
})
