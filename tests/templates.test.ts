import { describe, expect, it } from 'vitest'
import { BUILTIN_TEMPLATES } from '../src/vault/builtinTemplates'
import type { Template } from '../src/vault/model'
import { itemFromTemplate } from '../src/vault/templates'

describe('itemFromTemplate', () => {
  it('copies the field structure with empty values', () => {
    const template: Template = {
      id: 'tpl-1',
      name: '信用卡',
      description: '',
      fields: [
        { key: '卡号', kind: 'text' },
        { key: '照片', kind: 'file', hint: '卡正面' },
      ],
    }
    const item = itemFromTemplate(template, 'folder-1')
    expect(item.folderId).toBe('folder-1')
    expect(item.fields).toEqual([
      { key: '卡号', hint: undefined, value: { kind: 'text', text: '' } },
      {
        key: '照片',
        hint: '卡正面',
        value: { kind: 'file', blobId: null, filename: '', mime: '', size: 0 },
      },
    ])
  })

  it('creates an empty item without a template', () => {
    const item = itemFromTemplate(null, null)
    expect(item.fields).toEqual([])
    expect(item.folderId).toBeNull()
  })

  it('does not keep a reference to the template fields', () => {
    const template: Template = {
      id: 'tpl-2',
      name: '测试',
      description: '',
      fields: [{ key: '原字段', kind: 'text' }],
    }
    const item = itemFromTemplate(template, null)
    template.fields.push({ key: '新字段', kind: 'text' })
    expect(item.fields).toHaveLength(1)
    item.fields[0].key = '改过'
    expect(template.fields[0].key).toBe('原字段')
  })
})

describe('built-in templates', () => {
  it('have unique ids and valid fields', () => {
    const ids = new Set<string>()
    for (const template of BUILTIN_TEMPLATES) {
      expect(ids.has(template.id)).toBe(false)
      ids.add(template.id)
      expect(template.name).not.toBe('')
      for (const field of template.fields) {
        expect(field.kind === 'text' || field.kind === 'file').toBe(true)
        expect(field.key).not.toBe('')
      }
    }
  })

  it('expose a plain login-platform field in account templates', () => {
    for (const id of ['builtin:site-account', 'builtin:app-account', 'builtin:game']) {
      const template = BUILTIN_TEMPLATES.find((item) => item.id === id)
      expect(template).toBeDefined()
      const field = template?.fields.find((item) => item.key === '登录平台')
      expect(field?.kind).toBe('text')
      expect(field?.hint).toBeUndefined()
    }
  })
})
