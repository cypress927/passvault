import { randomId } from '../crypto/random'
import type { Field, Item, Template, TemplateField } from './model'

export function emptyField(field: TemplateField): Field {
  return {
    key: field.key,
    hint: field.hint,
    value:
      field.kind === 'file'
        ? { kind: 'file', blobId: null, filename: '', mime: '', size: 0 }
        : { kind: field.kind, text: '' },
  }
}

export function itemFromTemplate(template: Template | null, folderId: string | null): Item {
  return {
    id: randomId(),
    name: '',
    description: '',
    folderId,
    fields: template ? template.fields.map(emptyField) : [],
  }
}
