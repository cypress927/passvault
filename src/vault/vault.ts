import { concatBytes, decryptBody, encryptBody } from '../crypto/aead'
import { deriveKekInWorker } from '../crypto/argon2Client'
import { createDek, unwrapDek, wrapDek } from '../crypto/keys'
import { DEFAULT_KDF, type KdfParams } from '../crypto/kdf'
import { randomBytes } from '../crypto/random'
import { packContainer, unpackContainer } from './container'
import {
  FORMAT_VERSION,
  HEADER_SIZE,
  parseHeader,
  serializeHeader,
  type Header,
} from './format'
import type { Manifest, VaultData } from './model'

export interface OpenedVault {
  header: Header
  dek: Uint8Array
  data: VaultData
}

export async function createVault(
  password: string,
  kdf: KdfParams = DEFAULT_KDF,
): Promise<OpenedVault> {
  const salt = randomBytes(16)
  const kek = await deriveKekInWorker(password, salt, kdf)
  const dek = createDek()
  const { iv, wrapped } = await wrapDek(kek, dek)

  const header: Header = {
    formatVersion: FORMAT_VERSION,
    kdf,
    salt,
    wrapIv: iv,
    wrappedDek: wrapped,
  }

  const now = new Date().toISOString()
  const manifest: Manifest = {
    formatVersion: 1,
    createdAt: now,
    updatedAt: now,
    items: [],
    folders: [],
    templates: [],
    blobs: [],
  }

  return { header, dek, data: { manifest, blobs: new Map() } }
}

export async function openVault(
  fileBytes: Uint8Array,
  password: string,
): Promise<OpenedVault> {
  const header = parseHeader(fileBytes)
  if (fileBytes.length <= HEADER_SIZE) {
    throw new Error('文件已损坏：缺少数据体')
  }

  const headerBytes = fileBytes.subarray(0, HEADER_SIZE)
  const body = fileBytes.subarray(HEADER_SIZE)
  const kek = await deriveKekInWorker(password, header.salt, header.kdf)

  let dek: Uint8Array
  try {
    dek = await unwrapDek(kek, header.wrapIv, header.wrappedDek)
  } catch {
    throw new Error('密码错误，或文件已损坏')
  }

  let plaintext: Uint8Array
  try {
    plaintext = await decryptBody(dek, body, headerBytes)
  } catch {
    throw new Error('文件已损坏：数据解密失败')
  }
  return { header, dek, data: unpackContainer(plaintext) }
}

export async function exportVault(
  header: Header,
  dek: Uint8Array,
  data: VaultData,
): Promise<Uint8Array> {
  const headerBytes = serializeHeader(header)
  const plaintext = packContainer(data.manifest, data.blobs)
  const body = await encryptBody(dek, plaintext, headerBytes)
  return concatBytes(headerBytes, body)
}
