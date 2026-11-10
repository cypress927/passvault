import { useRef } from 'react'
import type { AppApi } from '../state/useVaultApp'
import type { Field, FileValue } from '../vault/model'
import {
  DownloadIcon,
  EyeIcon,
  FileIcon,
  ImageIcon,
  PlusIcon,
  XIcon,
} from './icons'

interface FieldRowProps {
  app: AppApi
  itemId: string
  index: number
  field: Field
  onPreview: (value: FileValue) => void
  onDownload: (value: FileValue) => void
}

export function FieldRow({ app, itemId, index, field, onPreview, onDownload }: FieldRowProps) {
  const update = (updater: (field: Field) => Field) =>
    app.updateField(itemId, index, updater)

  return (
    <div className="field-card">
      <input
        className="field-key"
        value={field.key}
        placeholder="字段名"
        onChange={(event) =>
          update((current) => ({ ...current, key: event.target.value }))
        }
      />
      <div className="field-value">
        {field.value.kind === 'text' ? (
          <textarea
            className="field-text"
            rows={1}
            value={field.value.text}
            placeholder={field.hint || '值'}
            onChange={(event) =>
              update((current) =>
                current.value.kind === 'text'
                  ? { ...current, value: { kind: 'text', text: event.target.value } }
                  : current,
              )
            }
          />
        ) : (
          <FileValueView
            app={app}
            itemId={itemId}
            index={index}
            value={field.value}
            onPreview={onPreview}
            onDownload={onDownload}
          />
        )}
      </div>
      <button
        className="icon-button field-remove"
        title="删除字段"
        onClick={() => app.removeField(itemId, index)}
      >
        <XIcon size={15} />
      </button>
    </div>
  )
}

function FileValueView({
  app,
  itemId,
  index,
  value,
  onPreview,
  onDownload,
}: {
  app: AppApi
  itemId: string
  index: number
  value: FileValue
  onPreview: (value: FileValue) => void
  onDownload: (value: FileValue) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isImage = value.mime.startsWith('image/')
  const choose = () => inputRef.current?.click()

  return (
    <div className="file-block">
      <div className={value.blobId === null ? 'file-empty' : 'file-chip'}>
        <span className={`file-type${isImage ? ' image' : ''}`}>
          {isImage ? <ImageIcon size={16} /> : <FileIcon size={16} />}
        </span>
        {value.blobId === null ? (
          <>
            <span className="file-empty-text">未选择文件</span>
            <div className="file-actions">
              <button className="button small soft" onClick={choose}>
                <PlusIcon size={14} />
                选择文件
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="file-meta">
              <span className="file-name" title={value.filename}>
                {value.filename}
              </span>
              <span className="file-size">{formatSize(value.size)}</span>
            </div>
            <div className="file-actions">
              {isImage && (
                <button className="button small ghost" onClick={() => onPreview(value)}>
                  <EyeIcon size={14} />
                  预览
                </button>
              )}
              <button className="button small ghost" onClick={() => onDownload(value)}>
                <DownloadIcon size={14} />
                下载
              </button>
              <button className="button small ghost" onClick={choose}>
                更换
              </button>
              <button
                className="button small ghost"
                onClick={() => app.clearFile(itemId, index)}
              >
                清除
              </button>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void app.setFile(itemId, index, file)
          }}
        />
      </div>
      {value.blobId !== null && (
        <p className="file-hint">下载后，文件会以明文离开保险库。</p>
      )}
    </div>
  )
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
