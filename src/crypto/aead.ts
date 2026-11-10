import { toBufferSource } from './bytes'
import { randomBytes } from './random'

const CHUNK_SIZE = 1024 * 1024
const IV_SIZE = 12
const TAG_SIZE = 16
const FRAME_HEADER_SIZE = 4 + 1 + IV_SIZE

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const chunk of chunks) total += chunk.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', toBufferSource(data)))
}

function chunkAad(
  headerHash: Uint8Array,
  index: number,
  flags: number,
  plainLen: number,
): Uint8Array {
  const aad = new Uint8Array(headerHash.length + 8 + 1 + 4)
  aad.set(headerHash, 0)
  const view = new DataView(aad.buffer)
  view.setBigUint64(headerHash.length, BigInt(index), false)
  aad[headerHash.length + 8] = flags
  view.setUint32(headerHash.length + 9, plainLen, false)
  return aad
}

async function importBodyKey(dek: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBufferSource(dek), { name: 'AES-GCM' }, false, [usage])
}

export async function encryptBody(
  dek: Uint8Array,
  plaintext: Uint8Array,
  header: Uint8Array,
): Promise<Uint8Array> {
  const key = await importBodyKey(dek, 'encrypt')
  const headerHash = await sha256(header)
  const chunkCount = Math.max(1, Math.ceil(plaintext.length / CHUNK_SIZE))
  const frames: Uint8Array[] = []

  for (let index = 0; index < chunkCount; index++) {
    const start = index * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, plaintext.length)
    const chunk = plaintext.subarray(start, end)
    const flags = index === chunkCount - 1 ? 1 : 0
    const iv = randomBytes(IV_SIZE)
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: toBufferSource(iv),
          additionalData: toBufferSource(chunkAad(headerHash, index, flags, chunk.length)),
          tagLength: 128,
        },
        key,
        toBufferSource(chunk),
      ),
    )

    const frame = new Uint8Array(FRAME_HEADER_SIZE + ciphertext.length)
    new DataView(frame.buffer).setUint32(0, chunk.length, false)
    frame[4] = flags
    frame.set(iv, 5)
    frame.set(ciphertext, FRAME_HEADER_SIZE)
    frames.push(frame)
  }

  return concatBytes(...frames)
}

export async function decryptBody(
  dek: Uint8Array,
  body: Uint8Array,
  header: Uint8Array,
): Promise<Uint8Array> {
  const key = await importBodyKey(dek, 'decrypt')
  const headerHash = await sha256(header)
  const chunks: Uint8Array[] = []
  let offset = 0
  let index = 0

  while (offset < body.length) {
    if (offset + FRAME_HEADER_SIZE > body.length) {
      throw new Error('文件已损坏：分块头不完整')
    }

    const plainLen = new DataView(
      body.buffer,
      body.byteOffset + offset,
      FRAME_HEADER_SIZE,
    ).getUint32(0, false)
    const flags = body[offset + 4]
    const final = (flags & 1) === 1
    const iv = body.subarray(offset + 5, offset + 5 + IV_SIZE)
    const frameEnd = offset + FRAME_HEADER_SIZE + plainLen + TAG_SIZE
    if (frameEnd > body.length) {
      throw new Error('文件已损坏：分块数据不完整')
    }

    const ciphertext = body.subarray(offset + FRAME_HEADER_SIZE, frameEnd)
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: toBufferSource(iv),
          additionalData: toBufferSource(chunkAad(headerHash, index, flags, plainLen)),
          tagLength: 128,
        },
        key,
        toBufferSource(ciphertext),
      ),
    )
    if (plaintext.length !== plainLen) {
      throw new Error('文件已损坏：分块长度不一致')
    }

    chunks.push(plaintext)
    offset = frameEnd
    index++

    if (final) {
      if (offset !== body.length) {
        throw new Error('文件已损坏：结束分块后有多余数据')
      }
      return concatBytes(...chunks)
    }
  }

  throw new Error('文件已损坏：缺少结束分块')
}
