export type TextKind = 'text' | 'password' | 'totp'

export interface TextValue {
  kind: TextKind
  text: string
}

export interface FileValue {
  kind: 'file'
  /** null means the field exists but the user has not chosen a file. */
  blobId: string | null
  filename: string
  mime: string
  size: number
}

export type FieldValue = TextValue | FileValue
export type FieldKind = FieldValue['kind']

export interface Field {
  key: string
  /** Optional placeholder shown while editing the value. */
  hint?: string
  value: FieldValue
}

export interface Item {
  id: string
  name: string
  description: string
  folderId: string | null
  fields: Field[]
}

export interface Folder {
  id: string
  name: string
}

export interface TemplateField {
  key: string
  kind: FieldKind
  hint?: string
}

export interface Template {
  id: string
  name: string
  description: string
  fields: TemplateField[]
}

export interface BlobRef {
  id: string
  offset: number
  size: number
}

export interface Manifest {
  formatVersion: 1
  createdAt: string
  updatedAt: string
  items: Item[]
  folders: Folder[]
  templates: Template[]
  blobs: BlobRef[]
}

export interface VaultData {
  manifest: Manifest
  blobs: Map<string, Uint8Array>
}
