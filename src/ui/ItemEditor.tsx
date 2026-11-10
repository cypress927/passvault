import { useState } from 'react'
import { toBufferSource } from '../crypto/bytes'
import type { AppApi } from '../state/useVaultApp'
import type { FileValue, Item } from '../vault/model'
import { FieldRow } from './FieldRow'
import { FolderIcon, ImageIcon, PlusIcon, TrashIcon, XIcon } from './icons'

export function ItemEditor({ app, item }: { app: AppApi; item: Item }) {
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null)

  const openPreview = (value: FileValue) => {
    const bytes = app.getBlob(value.blobId)
    if (!bytes) {
      app.setError('附件数据缺失')
      return
    }
    setPreview({
      url: URL.createObjectURL(new Blob([toBufferSource(bytes)], { type: value.mime })),
      filename: value.filename,
    })
  }

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const downloadAttachment = (value: FileValue) => {
    const bytes = app.getBlob(value.blobId)
    if (!bytes) {
      app.setError('附件数据缺失')
      return
    }
    const url = URL.createObjectURL(
      new Blob([toBufferSource(bytes)], { type: value.mime || 'application/octet-stream' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = value.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="editor">
      <input
        className="editor-title"
        value={item.name}
        placeholder="名称"
        onChange={(event) =>
          app.updateItem(item.id, (current) => ({ ...current, name: event.target.value }))
        }
      />
      <textarea
        className="editor-description"
        rows={1}
        value={item.description}
        placeholder="描述"
        onChange={(event) =>
          app.updateItem(item.id, (current) => ({
            ...current,
            description: event.target.value,
          }))
        }
      />

      <div className="editor-meta">
        <label className="folder-pill" title="移动到文件夹">
          <FolderIcon size={14} />
          <select
            value={item.folderId ?? ''}
            onChange={(event) => app.moveItem(item.id, event.target.value || null)}
          >
            <option value="">未分组</option>
            {app.folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="editor-rule" />

      <div className="fields-head">
        <div className="fields-title">
          字段
          <span className="count-chip">{item.fields.length}</span>
        </div>
        <div className="fields-actions">
          <button className="button small soft" onClick={() => app.addTextField(item.id)}>
            <PlusIcon size={14} />
            添加文本字段
          </button>
          <button className="button small soft" onClick={() => app.addFileField(item.id)}>
            <PlusIcon size={14} />
            添加文件字段
          </button>
        </div>
      </div>

      <div className="fields">
        {item.fields.map((field, index) => (
          <FieldRow
            key={index}
            app={app}
            itemId={item.id}
            index={index}
            field={field}
            onPreview={openPreview}
            onDownload={downloadAttachment}
          />
        ))}
        {item.fields.length === 0 && (
          <p className="empty-fields">还没有字段。添加文本字段或文件字段。</p>
        )}
      </div>

      <div className="editor-footer">
        <span className="editor-hint">修改只保存在内存里；点击「导出」才会生成新的加密文件。</span>
        <button className="button danger small" onClick={() => app.deleteItem(item.id)}>
          <TrashIcon size={15} />
          删除条目
        </button>
      </div>

      {preview && (
        <div className="modal" onClick={closePreview}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">
                <ImageIcon size={16} />
                {preview.filename}
              </span>
              <button className="icon-button" onClick={closePreview} aria-label="关闭">
                <XIcon size={17} />
              </button>
            </div>
            <img className="preview-image" src={preview.url} alt={preview.filename} />
          </div>
        </div>
      )}
    </div>
  )
}
