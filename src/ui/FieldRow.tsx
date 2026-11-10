import { useEffect, useRef, useState } from 'react'
import { toBufferSource } from '../crypto/bytes'
import type { AppApi } from '../state/useVaultApp'
import type { Field, FileValue, TextKind } from '../vault/model'
import { PasswordGeneratorDialog } from './PasswordGeneratorDialog'
import { TotpCode } from './TotpCode'
import {
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
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
  const [generatorOpen, setGeneratorOpen] = useState(false)

  const update = (updater: (field: Field) => Field) =>
    app.updateField(itemId, index, updater)

  const updateText = (text: string) =>
    update((current) =>
      current.value.kind === 'file'
        ? current
        : { ...current, value: { kind: current.value.kind, text } },
    )

  const changeKind = (kind: TextKind) =>
    update((current) =>
      current.value.kind === 'file'
        ? current
        : { ...current, value: { kind, text: current.value.text } },
    )

  const renderValue = () => {
    const value = field.value

    if (value.kind === 'file') {
      return (
        <FileValueView
          app={app}
          itemId={itemId}
          index={index}
          value={value}
          onPreview={onPreview}
          onDownload={onDownload}
        />
      )
    }

    if (value.kind === 'text') {
      return (
        <textarea
          className="field-text"
          rows={1}
          value={value.text}
          placeholder={field.hint || '值'}
          onChange={(event) => updateText(event.target.value)}
        />
      )
    }

    if (value.kind === 'password') {
      return (
        <SecretInput
          value={value.text}
          placeholder={field.hint || '密码'}
          onChange={updateText}
          onGenerate={() => setGeneratorOpen(true)}
        />
      )
    }

    return <TotpField value={value.text} onChange={updateText} />
  }

  return (
    <>
      <div className="field-card">
        <input
          className="field-key"
          value={field.key}
          placeholder="字段名"
          onChange={(event) =>
            update((current) => ({ ...current, key: event.target.value }))
          }
        />

        {field.value.kind === 'file' ? (
          <span className="field-kind static">文件</span>
        ) : (
          <select
            className="field-kind"
            value={field.value.kind}
            onChange={(event) => changeKind(event.target.value as TextKind)}
          >
            <option value="text">文本</option>
            <option value="password">密码</option>
            <option value="totp">TOTP</option>
          </select>
        )}

        <div className="field-value">{renderValue()}</div>

        <button
          className="icon-button field-remove"
          title="删除字段"
          onClick={() => app.removeField(itemId, index)}
        >
          <XIcon size={15} />
        </button>
      </div>

      {generatorOpen && (
        <PasswordGeneratorDialog
          options={app.passwordOptions}
          onOptionsChange={app.setPasswordOptions}
          onUse={(password) => {
            update((current) =>
              current.value.kind === 'password'
                ? { ...current, value: { kind: 'password', text: password } }
                : current,
            )
            setGeneratorOpen(false)
          }}
          onClose={() => setGeneratorOpen(false)}
        />
      )}
    </>
  )
}

function SecretInput({
  value,
  placeholder,
  onChange,
  onGenerate,
}: {
  value: string
  placeholder: string
  onChange: (text: string) => void
  onGenerate: () => void
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="secret-row">
      <input
        className="field-secret"
        type={revealed ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
        spellCheck={false}
      />
      <button
        type="button"
        className="icon-button"
        title={revealed ? '隐藏' : '显示'}
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
      <button type="button" className="button small soft" onClick={onGenerate}>
        生成
      </button>
    </div>
  )
}

function TotpField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="totp-row">
      <div className="secret-row">
        <input
          className="field-secret"
          type={revealed ? 'text' : 'password'}
          value={value}
          placeholder="Base32 密钥或 otpauth:// URI"
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="icon-button"
          title={revealed ? '隐藏' : '显示'}
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
      <TotpCode secret={value} />
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
      {value.blobId === null ? (
        <div className="file-empty">
          <span className="file-type">
            <FileIcon size={16} />
          </span>
          <span className="file-empty-text">未选择文件</span>
          <div className="file-actions">
            <button className="button small soft" onClick={choose}>
              <PlusIcon size={14} />
              选择文件
            </button>
          </div>
        </div>
      ) : (
        <div className="file-chip">
          {isImage ? (
            <FileThumb app={app} value={value} onPreview={onPreview} />
          ) : (
            <span className="file-type">
              <FileIcon size={16} />
            </span>
          )}
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
        </div>
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

      {value.blobId !== null && (
        <p className="file-hint">下载后，文件会以明文离开保险库。</p>
      )}
    </div>
  )
}

function FileThumb({
  app,
  value,
  onPreview,
}: {
  app: AppApi
  value: FileValue
  onPreview: (value: FileValue) => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (value.blobId === null) {
      setUrl(null)
      return
    }
    const bytes = app.getBlob(value.blobId)
    if (!bytes) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(
      new Blob([toBufferSource(bytes)], { type: value.mime }),
    )
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value.blobId, value.mime])

  if (!url) {
    return (
      <span className="file-type image">
        <ImageIcon size={16} />
      </span>
    )
  }

  return (
    <button
      type="button"
      className="file-thumb"
      onClick={() => onPreview(value)}
      title="查看图片"
    >
      <img src={url} alt={value.filename} />
    </button>
  )
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
