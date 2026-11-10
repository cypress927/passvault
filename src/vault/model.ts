export interface TextValue {
  kind: 'text'
  text: string
}

export interface FileValue {
  kind: 'file'
  blobId: string
  filename: string
  mime: string
  size: number
}

export type FieldValue = TextValue | FileValue

export interface Field {
  key: string
  value: FieldValue
}

export interface Item {
  id: string
  name: string
  description: string
  fields: Field[]
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
  blobs: BlobRef[]
}

export interface VaultData {
  manifest: Manifest
  blobs: Map<string, Uint8Array>
}
