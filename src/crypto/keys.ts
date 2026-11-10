import { toBufferSource } from './bytes'
import { randomBytes } from './random'

const WRAP_AAD = new TextEncoder().encode('PMV1-dek-wrap')

async function importKek(kek: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBufferSource(kek), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export function createDek(): Uint8Array {
  return randomBytes(32)
}

export async function wrapDek(
  kek: Uint8Array,
  dek: Uint8Array,
): Promise<{ iv: Uint8Array; wrapped: Uint8Array }> {
  const key = await importKek(kek)
  const iv = randomBytes(12)
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(WRAP_AAD), tagLength: 128 },
      key,
      toBufferSource(dek),
    ),
  )
  return { iv, wrapped }
}

export async function unwrapDek(
  kek: Uint8Array,
  iv: Uint8Array,
  wrapped: Uint8Array,
): Promise<Uint8Array> {
  const key = await importKek(kek)
  const dek = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(WRAP_AAD), tagLength: 128 },
      key,
      toBufferSource(wrapped),
    ),
  )
  if (dek.length !== 32) {
    throw new Error('文件已损坏：密钥长度异常')
  }
  return dek
}
