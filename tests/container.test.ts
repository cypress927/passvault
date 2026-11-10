import { describe, expect, it } from 'vitest'
import { packContainer, unpackContainer } from '../src/vault/container'
import type { Manifest, VaultData } from '../src/vault/model'

function sampleData(): VaultData {
  const manifest: Manifest = {
    formatVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    items: [
      {
        id: 'item-1',
        name: '路由器',
        description: '家里的路由器',
        fields: [
          { key: '用户名', value: { kind: 'text', text: 'admin' } },
          { key: '密码', value: { kind: 'text', text: 'p@ssw0rd' } },
          {
            key: '截图.png',
            value: {
              kind: 'file',
              blobId: 'blob-1',
              filename: '截图.png',
              mime: 'image/png',
              size: 5,
            },
          },
        ],
      },
      {
        id: 'item-2',
        name: '说明书',
        description: '',
        fields: [
          {
            key: 'manual.pdf',
            value: {
              kind: 'file',
              blobId: 'blob-2',
              filename: 'manual.pdf',
              mime: 'application/pdf',
              size: 3,
            },
          },
        ],
      },
    ],
    blobs: [],
  }

  return {
    manifest,
    blobs: new Map([
      ['blob-1', new Uint8Array([1, 2, 3, 4, 5])],
      ['blob-2', new Uint8Array([9, 8, 7])],
    ]),
  }
}

describe('container', () => {
  it('round-trips items and blobs', () => {
    const data = sampleData()
    const packed = packContainer(data.manifest, data.blobs)
    const unpacked = unpackContainer(packed)
    expect(unpacked.manifest.items).toEqual(data.manifest.items)
    expect(unpacked.manifest.blobs).toEqual([
      { id: 'blob-1', offset: 0, size: 5 },
      { id: 'blob-2', offset: 5, size: 3 },
    ])
    expect(unpacked.blobs.get('blob-1')).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    expect(unpacked.blobs.get('blob-2')).toEqual(new Uint8Array([9, 8, 7]))
  })

  it('handles an empty vault', () => {
    const data = sampleData()
    data.manifest.items = []
    data.blobs = new Map()
    const unpacked = unpackContainer(packContainer(data.manifest, data.blobs))
    expect(unpacked.manifest.items).toEqual([])
    expect(unpacked.manifest.blobs).toEqual([])
    expect(unpacked.blobs.size).toBe(0)
  })

  it('rejects a missing blob', () => {
    const data = sampleData()
    data.blobs.delete('blob-1')
    expect(() => packContainer(data.manifest, data.blobs)).toThrow('缺少附件数据')
  })

  it('rejects a corrupt manifest length', () => {
    const data = sampleData()
    const packed = packContainer(data.manifest, data.blobs)
    new DataView(packed.buffer, packed.byteOffset).setUint32(0, 0xfffffff0, false)
    expect(() => unpackContainer(packed)).toThrow('manifest 长度异常')
  })

  it('rejects invalid JSON', () => {
    const packed = new Uint8Array(32)
    new DataView(packed.buffer).setUint32(0, 20, false)
    packed.fill(0x7b, 4, 24)
    expect(() => unpackContainer(packed)).toThrow('manifest 不是有效 JSON')
  })

  it('rejects an out-of-bounds blob range', () => {
    const data = sampleData()
    const packed = packContainer(data.manifest, data.blobs)
    const manifestLen = new DataView(packed.buffer, packed.byteOffset).getUint32(0, false)
    const json = new TextDecoder().decode(packed.subarray(4, 4 + manifestLen))
    const manifest = JSON.parse(json)
    manifest.blobs[0].size = 999
    const patchedJson = new TextEncoder().encode(JSON.stringify(manifest))
    const patched = new Uint8Array(4 + patchedJson.length + 8)
    new DataView(patched.buffer).setUint32(0, patchedJson.length, false)
    patched.set(patchedJson, 4)
    patched.set(packed.subarray(4 + manifestLen), 4 + patchedJson.length)
    expect(() => unpackContainer(patched)).toThrow('附件区间越界')
  })
})
