import { describe, expect, it } from 'vitest'
import { createVault, exportVault, openVault } from '../src/vault/vault'
import { HEADER_SIZE } from '../src/vault/format'

const SMALL_KDF = { memoryKiB: 1024, iterations: 1, parallelism: 1 }

describe('vault round-trip', () => {
  it('creates, exports and opens with the same content', async () => {
    const vault = await createVault('correct horse', SMALL_KDF)
    vault.data.manifest.items.push({
      id: 'item-1',
      name: '邮箱',
      description: '主邮箱',
      fields: [
        { key: '账号', value: { kind: 'text', text: 'me@example.com' } },
        { key: '密码', value: { kind: 'text', text: 'hunter2' } },
        {
          key: 'avatar.png',
          value: {
            kind: 'file',
            blobId: 'blob-1',
            filename: 'avatar.png',
            mime: 'image/png',
            size: 4,
          },
        },
      ],
    })
    vault.data.blobs.set('blob-1', new Uint8Array([137, 80, 78, 71]))

    const bytes = await exportVault(vault.header, vault.dek, vault.data)
    expect(bytes.length).toBeGreaterThan(HEADER_SIZE)

    const opened = await openVault(bytes, 'correct horse')
    expect(opened.data.manifest.items).toEqual(vault.data.manifest.items)
    expect(opened.data.blobs.get('blob-1')).toEqual(new Uint8Array([137, 80, 78, 71]))
  })

  it('rejects a wrong password', async () => {
    const vault = await createVault('right', SMALL_KDF)
    const bytes = await exportVault(vault.header, vault.dek, vault.data)
    await expect(openVault(bytes, 'wrong')).rejects.toThrow('密码错误')
  })

  it('rejects a tampered file', async () => {
    const vault = await createVault('pw', SMALL_KDF)
    const bytes = await exportVault(vault.header, vault.dek, vault.data)
    const tampered = bytes.slice()
    tampered[HEADER_SIZE + 3] ^= 0x01
    await expect(openVault(tampered, 'pw')).rejects.toThrow()
  })

  it('rejects a truncated file', async () => {
    const vault = await createVault('pw', SMALL_KDF)
    const bytes = await exportVault(vault.header, vault.dek, vault.data)
    await expect(openVault(bytes.subarray(0, bytes.length - 1), 'pw')).rejects.toThrow()
  })
})
