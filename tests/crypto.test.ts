import { describe, expect, it } from 'vitest'
import { concatBytes, decryptBody, encryptBody } from '../src/crypto/aead'
import { deriveKek } from '../src/crypto/kdf'
import { createDek, unwrapDek, wrapDek } from '../src/crypto/keys'

const HEADER = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
const SMALL_KDF = { memoryKiB: 1024, iterations: 1, parallelism: 1 }

function splitFrames(body: Uint8Array): Uint8Array[] {
  const frames: Uint8Array[] = []
  let offset = 0
  while (offset < body.length) {
    const plainLen = new DataView(body.buffer, body.byteOffset + offset, 4).getUint32(0, false)
    const end = offset + 17 + plainLen + 16
    frames.push(body.slice(offset, end))
    offset = end
  }
  return frames
}

describe('Argon2id', () => {
  it('matches the known-answer value', async () => {
    const salt = Uint8Array.from({ length: 16 }, (_, i) => i)
    const key = await deriveKek('passmgmt-test', salt, SMALL_KDF)
    expect(Array.from(key, (byte) => byte.toString(16).padStart(2, '0')).join('')).toBe(
      '124d102c62c6a222f8ab235ec4ca1dad3c5cb4b3e47c69a1c071499b1f6a2e10',
    )
  })

  it('depends on password and salt', async () => {
    const salt = new Uint8Array(16).fill(7)
    const a = await deriveKek('one', salt, SMALL_KDF)
    const b = await deriveKek('two', salt, SMALL_KDF)
    const c = await deriveKek('one', new Uint8Array(16).fill(8), SMALL_KDF)
    expect(a).not.toEqual(b)
    expect(a).not.toEqual(c)
  })
})

describe('chunked AES-GCM', () => {
  it('round-trips empty and small payloads', async () => {
    const dek = createDek()
    for (const size of [0, 1, 1024]) {
      const plaintext = Uint8Array.from({ length: size }, (_, i) => i % 251)
      const body = await encryptBody(dek, plaintext, HEADER)
      expect(await decryptBody(dek, body, HEADER)).toEqual(plaintext)
    }
  })

  it('round-trips a multi-chunk payload', async () => {
    const dek = createDek()
    const plaintext = Uint8Array.from({ length: 2 * 1024 * 1024 + 12345 }, (_, i) => i % 251)
    const body = await encryptBody(dek, plaintext, HEADER)
    expect(splitFrames(body)).toHaveLength(3)
    expect(await decryptBody(dek, body, HEADER)).toEqual(plaintext)
  })

  it('rejects a wrong key', async () => {
    const body = await encryptBody(createDek(), new Uint8Array([1, 2, 3]), HEADER)
    await expect(decryptBody(createDek(), body, HEADER)).rejects.toThrow()
  })

  it('rejects any modified byte', async () => {
    const dek = createDek()
    const body = await encryptBody(dek, new Uint8Array(4096).fill(42), HEADER)
    for (const index of [0, 4, 10, Math.floor(body.length / 2), body.length - 1]) {
      const tampered = body.slice()
      tampered[index] ^= 0x01
      await expect(decryptBody(dek, tampered, HEADER)).rejects.toThrow()
    }
  })

  it('authenticates the full frame header', async () => {
    const dek = createDek()
    const body = await encryptBody(dek, new Uint8Array([1, 2, 3]), HEADER)
    const tampered = body.slice()
    tampered[4] ^= 0x02
    await expect(decryptBody(dek, tampered, HEADER)).rejects.toThrow()
  })

  it('rejects a modified header', async () => {
    const dek = createDek()
    const body = await encryptBody(dek, new Uint8Array([1, 2, 3]), HEADER)
    const otherHeader = HEADER.slice()
    otherHeader[0] ^= 0x01
    await expect(decryptBody(dek, body, otherHeader)).rejects.toThrow()
  })

  it('rejects truncated or reordered chunks', async () => {
    const dek = createDek()
    const plaintext = new Uint8Array(2 * 1024 * 1024 + 7).fill(9)
    const body = await encryptBody(dek, plaintext, HEADER)

    await expect(decryptBody(dek, body.subarray(0, body.length - 1), HEADER)).rejects.toThrow()

    const frames = splitFrames(body)
    const reordered = concatBytes(frames[1], frames[0], frames[2])
    await expect(decryptBody(dek, reordered, HEADER)).rejects.toThrow()
  })
})

describe('DEK wrapping', () => {
  it('round-trips', async () => {
    const kek = createDek()
    const dek = createDek()
    const { iv, wrapped } = await wrapDek(kek, dek)
    expect(await unwrapDek(kek, iv, wrapped)).toEqual(dek)
  })

  it('rejects a wrong KEK', async () => {
    const { iv, wrapped } = await wrapDek(createDek(), createDek())
    await expect(unwrapDek(createDek(), iv, wrapped)).rejects.toThrow()
  })
})
