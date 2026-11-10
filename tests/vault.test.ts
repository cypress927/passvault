import { describe, expect, it } from 'vitest'
import { createVault, exportVault, openVault } from '../src/vault/vault'
import { HEADER_SIZE } from '../src/vault/format'

const SMALL_KDF = { memoryKiB: 1024, iterations: 1, parallelism: 1 }

describe('vault round-trip', () => {
  it('creates, exports and opens with the same content', async () => {
    const vault = await createVault('correct horse', SMALL_KDF)
    vault.data.manifest.folders.push({ id: 'folder-1', name: '工作' })
    vault.data.manifest.templates.push({
      id: 'tpl-1',
      name: '自定义模板',
      description: '测试用',
      fields: [{ key: '账号', kind: 'text', hint: '邮箱或手机号' }],
    })
    vault.data.manifest.items.push({
      id: 'item-1',
      name: '邮箱',
      description: '主邮箱',
      folderId: 'folder-1',
      fields: [
        { key: '账号', value: { kind: 'text', text: 'me@example.com' } },
        { key: '密码', value: { kind: 'password', text: 'hunter2' } },
        { key: 'TOTP 密钥', value: { kind: 'totp', text: 'JBSWY3DPEHPK3PXP' } },
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
        {
          key: '身份证正面照片',
          value: { kind: 'file', blobId: null, filename: '', mime: '', size: 0 },
        },
      ],
    })
    vault.data.blobs.set('blob-1', new Uint8Array([137, 80, 78, 71]))

    const bytes = await exportVault(vault.header, vault.dek, vault.data)
    expect(bytes.length).toBeGreaterThan(HEADER_SIZE)

    const opened = await openVault(bytes, 'correct horse')
    expect(opened.data.manifest.items).toEqual(vault.data.manifest.items)
    expect(opened.data.manifest.folders).toEqual(vault.data.manifest.folders)
    expect(opened.data.manifest.templates).toEqual(vault.data.manifest.templates)
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
