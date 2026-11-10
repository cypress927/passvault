import { useCallback, useMemo, useState } from 'react'
import { toBufferSource } from '../crypto/bytes'
import { randomId } from '../crypto/random'
import type { Field, FileValue, Item, VaultData } from '../vault/model'
import type { Header } from '../vault/format'
import { createVault, exportVault, openVault } from '../vault/vault'

export interface Session {
  header: Header
  dek: Uint8Array
  data: VaultData
  filename: string
  dirty: boolean
}

export interface AppApi {
  screen: 'welcome' | 'workspace'
  session: Session | null
  items: Item[]
  filteredItems: Item[]
  selectedItem: Item | null
  selectedId: string | null
  query: string
  busy: string | null
  error: string | null

  setError(message: string): void
  dismissError(): void

  create(password: string): Promise<void>
  importFile(file: File, password: string): Promise<void>
  exportCurrent(): Promise<void>
  lock(): void

  select(id: string | null): void
  setQuery(query: string): void

  addItem(): void
  updateItem(id: string, updater: (item: Item) => Item): void
  deleteItem(id: string): void

  addTextField(itemId: string): void
  addFileField(itemId: string, file: File): Promise<void>
  updateField(itemId: string, index: number, updater: (field: Field) => Field): void
  removeField(itemId: string, index: number): void
  getBlob(blobId: string): Uint8Array | undefined
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function defaultFilename(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `vault-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.vault`
}

function matchesQuery(item: Item, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  if (item.name.toLowerCase().includes(needle)) return true
  if (item.description.toLowerCase().includes(needle)) return true
  return item.fields.some((field) => {
    if (field.key.toLowerCase().includes(needle)) return true
    if (field.value.kind === 'text') return field.value.text.toLowerCase().includes(needle)
    return field.value.filename.toLowerCase().includes(needle)
  })
}

function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([toBufferSource(bytes)], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useVaultApp(): AppApi {
  const [session, setSession] = useState<Session | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (password: string) => {
    setBusy('正在生成密钥…')
    setError(null)
    try {
      const opened = await createVault(password)
      setSession({ ...opened, filename: defaultFilename(), dirty: true })
      setSelectedId(null)
      setQuery('')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }, [])

  const importFile = useCallback(async (file: File, password: string) => {
    setBusy('正在解密…')
    setError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const opened = await openVault(bytes, password)
      setSession({ ...opened, filename: file.name, dirty: false })
      setSelectedId(null)
      setQuery('')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }, [])

  const exportCurrent = useCallback(async () => {
    if (!session) return
    setBusy('正在加密…')
    setError(null)
    try {
      const manifest = { ...session.data.manifest, updatedAt: new Date().toISOString() }
      const data: VaultData = { ...session.data, manifest }
      const bytes = await exportVault(session.header, session.dek, data)
      downloadBytes(bytes, session.filename)
      setSession((current) => {
        if (!current) return current
        // Edits made while encrypting are not part of the exported file; keep them dirty.
        return current === session ? { ...current, data, dirty: false } : current
      })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }, [session])

  const lock = useCallback(() => {
    setSession(null)
    setSelectedId(null)
    setQuery('')
    setError(null)
  }, [])

  const updateItem = useCallback((id: string, updater: (item: Item) => Item) => {
    setSession((current) => {
      if (!current) return current
      return {
        ...current,
        dirty: true,
        data: {
          ...current.data,
          manifest: {
            ...current.data.manifest,
            updatedAt: new Date().toISOString(),
            items: current.data.manifest.items.map((item) =>
              item.id === id ? updater(item) : item,
            ),
          },
        },
      }
    })
  }, [])

  const addItem = useCallback(() => {
    const id = randomId()
    setSession((current) => {
      if (!current) return current
      const item: Item = { id, name: '', description: '', fields: [] }
      return {
        ...current,
        dirty: true,
        data: {
          ...current.data,
          manifest: {
            ...current.data.manifest,
            updatedAt: new Date().toISOString(),
            items: [...current.data.manifest.items, item],
          },
        },
      }
    })
    setSelectedId(id)
    setQuery('')
  }, [])

  const deleteItem = useCallback((id: string) => {
    setSession((current) => {
      if (!current) return current
      return {
        ...current,
        dirty: true,
        data: {
          ...current.data,
          manifest: {
            ...current.data.manifest,
            updatedAt: new Date().toISOString(),
            items: current.data.manifest.items.filter((item) => item.id !== id),
          },
        },
      }
    })
    setSelectedId((current) => (current === id ? null : current))
  }, [])

  const addTextField = useCallback(
    (itemId: string) => {
      updateItem(itemId, (item) => ({
        ...item,
        fields: [...item.fields, { key: '', value: { kind: 'text', text: '' } }],
      }))
    },
    [updateItem],
  )

  const addFileField = useCallback(async (itemId: string, file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const blobId = randomId()
    const value: FileValue = {
      kind: 'file',
      blobId,
      filename: file.name,
      mime: file.type || 'application/octet-stream',
      size: bytes.length,
    }
    setSession((current) => {
      if (!current) return current
      const blobs = new Map(current.data.blobs)
      blobs.set(blobId, bytes)
      return {
        ...current,
        dirty: true,
        data: {
          ...current.data,
          blobs,
          manifest: {
            ...current.data.manifest,
            updatedAt: new Date().toISOString(),
            items: current.data.manifest.items.map((item) =>
              item.id === itemId
                ? { ...item, fields: [...item.fields, { key: file.name, value }] }
                : item,
            ),
          },
        },
      }
    })
  }, [])

  const updateField = useCallback(
    (itemId: string, index: number, updater: (field: Field) => Field) => {
      updateItem(itemId, (item) => ({
        ...item,
        fields: item.fields.map((field, current) => (current === index ? updater(field) : field)),
      }))
    },
    [updateItem],
  )

  const removeField = useCallback(
    (itemId: string, index: number) => {
      updateItem(itemId, (item) => ({
        ...item,
        fields: item.fields.filter((_, current) => current !== index),
      }))
    },
    [updateItem],
  )

  const getBlob = useCallback(
    (blobId: string) => session?.data.blobs.get(blobId),
    [session],
  )

  const items = session?.data.manifest.items ?? []
  const filteredItems = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  )
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  )

  return {
    screen: session ? 'workspace' : 'welcome',
    session,
    items,
    filteredItems,
    selectedItem,
    selectedId,
    query,
    busy,
    error,
    setError,
    dismissError: () => setError(null),
    create,
    importFile,
    exportCurrent,
    lock,
    select: setSelectedId,
    setQuery,
    addItem,
    updateItem,
    deleteItem,
    addTextField,
    addFileField,
    updateField,
    removeField,
    getBlob,
  }
}
