import { toBufferSource } from './bytes'

export type TotpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export interface TotpConfig {
  secret: Uint8Array
  digits: number
  period: number
  algorithm: TotpAlgorithm
}

export type TotpParseResult =
  | { ok: true; config: TotpConfig }
  | { ok: false; error: string }

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const WHITESPACE = new Set(
  Array.from([
    String.fromCharCode(32),
    String.fromCharCode(9),
    String.fromCharCode(10),
    String.fromCharCode(13),
  ]),
)

function decodeBase32(input: string): Uint8Array {
  const clean = Array.from(input.toUpperCase())
    .filter((char) => !WHITESPACE.has(char) && char !== '-')
    .join('')
    .replace(/=+$/, '')

  if (clean === '') throw new Error('密钥为空')
  if (/[^A-Z2-7]/.test(clean)) throw new Error('密钥不是有效的 Base32')

  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of clean) {
    const value = BASE32.indexOf(char)
    buffer = (buffer << 5) | value
    bits += 5
    while (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
    buffer &= (1 << bits) - 1
  }

  if (out.length === 0) throw new Error('密钥为空')
  return new Uint8Array(out)
}

function parseAlgorithm(value: string): TotpAlgorithm | null {
  const normalized = value.toUpperCase().replace('-', '')
  if (normalized === 'SHA1') return 'SHA-1'
  if (normalized === 'SHA256') return 'SHA-256'
  if (normalized === 'SHA512') return 'SHA-512'
  return null
}

export function parseTotpSecret(input: string): TotpParseResult {
  const value = input.trim()
  if (value === '') return { ok: false, error: '密钥为空' }

  try {
    if (value.toLowerCase().startsWith('otpauth://')) {
      const url = new URL(value)
      if (url.host.toLowerCase() !== 'totp') {
        return { ok: false, error: '只支持 TOTP，不支持 HOTP' }
      }

      const secretParam = url.searchParams.get('secret')
      if (!secretParam) return { ok: false, error: 'URI 里没有 secret 参数' }

      const digits = Number(url.searchParams.get('digits') ?? '6')
      const period = Number(url.searchParams.get('period') ?? '30')
      const algorithm = parseAlgorithm(url.searchParams.get('algorithm') ?? 'SHA1')

      if (digits !== 6 && digits !== 8) {
        return { ok: false, error: '只支持 6 位或 8 位验证码' }
      }
      if (!Number.isInteger(period) || period < 1 || period > 300) {
        return { ok: false, error: '周期参数无效' }
      }
      if (!algorithm) {
        return { ok: false, error: '不支持的算法' }
      }

      return {
        ok: true,
        config: { secret: decodeBase32(secretParam), digits, period, algorithm },
      }
    }

    return {
      ok: true,
      config: { secret: decodeBase32(value), digits: 6, period: 30, algorithm: 'SHA-1' },
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function generateTotp(
  config: TotpConfig,
  timestampSeconds: number,
): Promise<string> {
  const counter = Math.floor(timestampSeconds / config.period)
  const buffer = new ArrayBuffer(8)
  new DataView(buffer).setBigUint64(0, BigInt(counter), false)

  const key = await crypto.subtle.importKey(
    'raw',
    toBufferSource(config.secret),
    { name: 'HMAC', hash: config.algorithm },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer))
  const offset = signature[signature.length - 1] & 0x0f
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff)

  const modulus = 10 ** config.digits
  return String(binary % modulus).padStart(config.digits, '0')
}

export function totpRemaining(period: number, timestampSeconds: number): number {
  return period - (timestampSeconds % period)
}
