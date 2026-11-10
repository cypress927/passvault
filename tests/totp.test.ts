import { describe, expect, it } from 'vitest'
import {
  generateTotp,
  parseTotpSecret,
  totpRemaining,
  type TotpAlgorithm,
  type TotpConfig,
} from '../src/crypto/totp'

const encoder = new TextEncoder()
const SHA1_SECRET = encoder.encode('12345678901234567890')
const SHA256_SECRET = encoder.encode('12345678901234567890123456789012')
const SHA512_SECRET = encoder.encode(
  '1234567890123456789012345678901234567890123456789012345678901234',
)
const BASE32_SHA1 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

function config(secret: Uint8Array, algorithm: TotpAlgorithm): TotpConfig {
  return { secret, digits: 8, period: 30, algorithm }
}

describe('generateTotp', () => {
  it('matches RFC 6238 SHA-1 vectors', async () => {
    const vectors: Array<[number, string]> = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130'],
    ]
    for (const [time, code] of vectors) {
      expect(await generateTotp(config(SHA1_SECRET, 'SHA-1'), time)).toBe(code)
    }
  })

  it('matches RFC 6238 SHA-256 vectors', async () => {
    expect(await generateTotp(config(SHA256_SECRET, 'SHA-256'), 59)).toBe('46119246')
    expect(await generateTotp(config(SHA256_SECRET, 'SHA-256'), 1111111109)).toBe('68084774')
  })

  it('matches RFC 6238 SHA-512 vectors', async () => {
    expect(await generateTotp(config(SHA512_SECRET, 'SHA-512'), 59)).toBe('90693936')
    expect(await generateTotp(config(SHA512_SECRET, 'SHA-512'), 1111111109)).toBe('25091201')
  })
})

describe('parseTotpSecret', () => {
  it('parses a raw Base32 secret', () => {
    const parsed = parseTotpSecret(BASE32_SHA1)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.config.digits).toBe(6)
      expect(parsed.config.period).toBe(30)
      expect(parsed.config.algorithm).toBe('SHA-1')
    }
  })

  it('generates a six-digit code from a raw secret', async () => {
    const parsed = parseTotpSecret(BASE32_SHA1)
    if (!parsed.ok) throw new Error('parse failed')
    expect(await generateTotp(parsed.config, 59)).toBe('287082')
  })

  it('parses an otpauth URI with parameters', async () => {
    const parsed = parseTotpSecret(
      'otpauth://totp/Example:alice?secret=' +
        BASE32_SHA1 +
        '&digits=8&period=30&algorithm=SHA1',
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.config.digits).toBe(8)
    expect(await generateTotp(parsed.config, 59)).toBe('94287082')
  })

  it('accepts lowercase and spaces in Base32', () => {
    expect(parseTotpSecret('gezd gnbv gy3t qojq gezd gnbv gy3t qojq').ok).toBe(true)
  })

  it('rejects HOTP URIs', () => {
    const parsed = parseTotpSecret('otpauth://hotp/Example?secret=' + BASE32_SHA1)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toContain('HOTP')
  })

  it('rejects invalid Base32', () => {
    expect(parseTotpSecret('not-base32!!').ok).toBe(false)
  })

  it('rejects unsupported digit counts', () => {
    const parsed = parseTotpSecret(
      'otpauth://totp/Example?secret=' + BASE32_SHA1 + '&digits=7',
    )
    expect(parsed.ok).toBe(false)
  })
})

describe('totpRemaining', () => {
  it('counts down within the period', () => {
    expect(totpRemaining(30, 30)).toBe(30)
    expect(totpRemaining(30, 59)).toBe(1)
    expect(totpRemaining(60, 61)).toBe(59)
  })
})
