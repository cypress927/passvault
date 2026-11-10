import { useCallback, useMemo, useState } from 'react'
import { toBufferSource } from '../crypto/bytes'
import { randomId } from '../crypto/random'
import type { Field, FileValue, Folder, Item, Template, VaultData } from '../vault/model'
import type { Header } from '../vault/format'
import type { ParsedCsvImport } from '../vault/keepassCsv'
import { itemFromTemplate } from '../vault/templates'
import { createVault, exportVault, openVault } from '../vault/vault'

export interface Session {
  header: Header
  dek: Uint8Array
  data: VaultData
  filename: string
  dirty: boolean
}

/** 'all' = every item, 'none' = items without a folder, otherwise a folder id. */
export type FolderFilter = 'all' | 'none' | string

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
  notice: string | null
  folders: Folder[]
  activeFolder: FolderFilter
  templates: Template[]

  setError(message: string): void
  dismissError(): void
  showNotice(message: string): void
  dismissNotice(): void

  create(password: string): Promise<void>
  importFile(file: File, password: string): Promise<void>
  exportCurrent(): Promise<void>
  lock(): void

  select(id: string | null): void
  setQuery(query: string): void
  setActiveFolder(filter: FolderFilter): void

  createItem(template: Template | null): void
  updateItem(id: string, updater: (item: Item) => Item): void
  deleteItem(id: string): void
  moveItem(itemId: string, folderId: string | null): void

  addTextField(itemId: string): void
  addFileField(itemId: string): void
  updateField(itemId: string, index: number, updater: (field: Field) => Field): void
  removeField(itemId: string, index: number): void
  setFile(itemId: string, index: number, file: File): Promise<void>
  clearFile(itemId: string, index: number): void
  getBlob(blobId: string | null): Uint8Array | undefined

  addFolder(name: string): void
  renameFolder(id: string, name: string): void
  deleteFolder(id: string): void

  saveTemplate(template: Template): void
  deleteTemplate(id: string): void

  importCsv(parsed: ParsedCsvImport): void
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

const EMPTY_FILE: FileValue = { kind: 'file', blobId: null, filename: '', mime: '', size: 0 }

function cloneField(field: Field): Field {
  if (field.value.kind === 'text') {
    return { key: field.key, hint: field.hint, value: { kind: 'text', text: field.value.text } }
  }
  return { key: field.key, hint: field.hint, value: { ...field.value } }
}

export function useVaultApp(): AppApi {
  const [session, setSession] = useState<Session | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeFolder, setActiveFolder] = useState<FolderFilter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const create = useCallback(async (password: string) => {
    setBusy('正在生成密钥…')
    setError(null)
    try {
      const opened = await createVault(password)
      setSession({ ...opened, filename: defaultFilename(), dirty: true })
      setSelectedId(null)
      setQuery('')
      setActiveFolder('all')
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
      setActiveFolder('all')
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
    setActiveFolder('all')
    setError(null)
    setNotice(null)
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

  const createItem = useCallback(
    (template: Template | null) => {
      const folderId =
        activeFolder !== 'all' && activeFolder !== 'none' ? activeFolder : null
      const item = itemFromTemplate(template, folderId)
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
              items: [...current.data.manifest.items, item],
            },
          },
        }
      })
      setSelectedId(item.id)
      setQuery('')
    },
    [activeFolder],
  )

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

  const moveItem = useCallback(
    (itemId: string, folderId: string | null) => {
      updateItem(itemId, (item) => ({ ...item, folderId }))
    },
    [updateItem],
  )

  const addTextField = useCallback(
    (itemId: string) => {
      updateItem(itemId, (item) => ({
        ...item,
        fields: [...item.fields, { key: '', value: { kind: 'text', text: '' } }],
      }))
    },
    [updateItem],
  )

  const addFileField = useCallback(
    (itemId: string) => {
      updateItem(itemId, (item) => ({
        ...item,
        fields: [...item.fields, { key: '', value: { ...EMPTY_FILE } }],
      }))
    },
    [updateItem],
  )

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

  const setFile = useCallback(async (itemId: string, index: number, file: File) => {
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
                ? {
                    ...item,
                    fields: item.fields.map((field, currentIndex) =>
                      currentIndex === index ? { ...field, value } : field,
                    ),
                  }
                : item,
            ),
          },
        },
      }
    })
  }, [])

  const clearFile = useCallback(
    (itemId: string, index: number) => {
      updateField(itemId, index, (field) =>
        field.value.kind === 'file' ? { ...field, value: { ...EMPTY_FILE } } : field,
      )
    },
    [updateField],
  )

  const addFolder = useCallback((name: string) => {
    const folder: Folder = { id: randomId(), name }
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
            folders: [...current.data.manifest.folders, folder],
          },
        },
      }
    })
  }, [])

  const renameFolder = useCallback((id: string, name: string) => {
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
            folders: current.data.manifest.folders.map((folder) =>
              folder.id === id ? { ...folder, name } : folder,
            ),
          },
        },
      }
    })
  }, [])

  const deleteFolder = useCallback((id: string) => {
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
            folders: current.data.manifest.folders.filter((folder) => folder.id !== id),
            items: current.data.manifest.items.map((item) =>
              item.folderId === id ? { ...item, folderId: null } : item,
            ),
          },
        },
      }
    })
    setActiveFolder((current) => (current === id ? 'all' : current))
  }, [])

  const saveTemplate = useCallback((template: Template) => {
    setSession((current) => {
      if (!current) return current
      const existing = current.data.manifest.templates.some((item) => item.id === template.id)
      return {
        ...current,
        dirty: true,
        data: {
          ...current.data,
          manifest: {
            ...current.data.manifest,
            updatedAt: new Date().toISOString(),
            templates: existing
              ? current.data.manifest.templates.map((item) =>
                  item.id === template.id ? template : item,
                )
              : [...current.data.manifest.templates, template],
          },
        },
      }
    })
  }, [])

  const deleteTemplate = useCallback((id: string) => {
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
            templates: current.data.manifest.templates.filter((template) => template.id !== id),
          },
        },
      }
    })
  }, [])

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    setError(null)
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])

  const importCsv = useCallback((parsed: ParsedCsvImport) => {
    setSession((current) => {
      if (!current) return current

      const folders = [...current.data.manifest.folders]
      const folderByName = new Map(folders.map((folder) => [folder.name, folder.id]))
      for (const name of parsed.folders) {
        if (!folderByName.has(name)) {
          const folder: Folder = { id: randomId(), name }
          folders.push(folder)
          folderByName.set(name, folder.id)
        }
      }

      const items: Item[] = parsed.entries.map((entry) => ({
        id: randomId(),
        name: entry.name,
        description: entry.description,
        folderId: entry.folderName ? (folderByName.get(entry.folderName) ?? null) : null,
        fields: entry.fields.map(cloneField),
      }))

      return {
        ...current,
        dirty: true,
        data: {
          ...current.data,
          manifest: {
            ...current.data.manifest,
            updatedAt: new Date().toISOString(),
            folders,
            items: [...current.data.manifest.items, ...items],
          },
        },
      }
    })
    setActiveFolder('all')
    setQuery('')
  }, [])

  const getBlob = useCallback(
    (blobId: string | null) => (blobId ? session?.data.blobs.get(blobId) : undefined),
    [session],
  )

  const items = session?.data.manifest.items ?? []
  const folders = session?.data.manifest.folders ?? []
  const templates = session?.data.manifest.templates ?? []

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFolder === 'none') {
        if (item.folderId !== null) return false
      } else if (activeFolder !== 'all') {
        if (item.folderId !== activeFolder) return false
      }
      return matchesQuery(item, query)
    })
  }, [items, query, activeFolder])

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
    notice,
    folders,
    activeFolder,
    templates,
    setError,
    dismissError: () => setError(null),
    showNotice,
    dismissNotice,
    create,
    importFile,
    exportCurrent,
    lock,
    select: setSelectedId,
    setQuery,
    setActiveFolder,
    createItem,
    updateItem,
    deleteItem,
    moveItem,
    addTextField,
    addFileField,
    updateField,
    removeField,
    setFile,
    clearFile,
    getBlob,
    addFolder,
    renameFolder,
    deleteFolder,
    saveTemplate,
    deleteTemplate,
    importCsv,
  }
}
