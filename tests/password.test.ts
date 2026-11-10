import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  type PasswordOptions,
} from '../src/crypto/password'

describe('generatePassword', () => {
  it('respects length and selected character sets', () => {
    const options: PasswordOptions = {
      length: 32,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: false,
      excludeAmbiguous: false,
    }
    for (let index = 0; index < 20; index++) {
      const password = generatePassword(options)
      expect(password).toHaveLength(32)
      expect(/^[A-Za-z0-9]+$/.test(password)).toBe(true)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/[A-Z]/.test(password)).toBe(true)
      expect(/[0-9]/.test(password)).toBe(true)
    }
  })

  it('excludes ambiguous characters when requested', () => {
    const options: PasswordOptions = {
      length: 64,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: true,
    }
    for (let index = 0; index < 20; index++) {
      expect(/[0O1lI|]/.test(generatePassword(options))).toBe(false)
    }
  })

  it('throws when no character set is selected', () => {
    expect(() =>
      generatePassword({
        ...DEFAULT_PASSWORD_OPTIONS,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
      }),
    ).toThrow('至少选择一种字符')
  })

  it('throws for an invalid length', () => {
    expect(() => generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 3 })).toThrow('长度')
    expect(() => generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 129 })).toThrow('长度')
  })

  it('produces different passwords', () => {
    const first = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 32 })
    const second = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 32 })
    expect(first).not.toBe(second)
  })
})
