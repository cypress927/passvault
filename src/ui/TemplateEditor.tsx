import { useState, type FormEvent } from 'react'
import type { AppApi } from '../state/useVaultApp'
import type { Template, TemplateField } from '../vault/model'
import { DownIcon, PlusIcon, UpIcon, XIcon } from './icons'

export function TemplateEditor({
  app,
  template,
  onDone,
  onClose,
}: {
  app: AppApi
  template: Template
  onDone: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description)
  const [fields, setFields] = useState<TemplateField[]>(template.fields)
  const [error, setError] = useState<string | null>(null)

  const update = (index: number, updater: (field: TemplateField) => TemplateField) => {
    setFields((current) =>
      current.map((field, currentIndex) => (currentIndex === index ? updater(field) : field)),
    )
  }

  const add = (kind: 'text' | 'file') => {
    setFields((current) => [...current, { key: '', kind }])
  }

  const remove = (index: number) => {
    setFields((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const move = (index: number, delta: number) => {
    setFields((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      const [field] = next.splice(index, 1)
      next.splice(target, 0, field)
      return next
    })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入模板名')
      return
    }
    app.saveTemplate({
      ...template,
      name: trimmed,
      description: description.trim(),
      fields,
    })
    onDone()
  }

  return (
    <div className="modal" onClick={onClose}>
      <form
        className="modal-panel template-editor"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="panel-head">
          <div>
            <h2>{template.name ? '编辑模板' : '新建模板'}</h2>
            <p>只定义字段结构，不预填任何值。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <XIcon size={17} />
          </button>
        </div>

        <div className="editor-form">
          <label className="field-label">
            模板名
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：信用卡"
            />
          </label>
          <label className="field-label">
            说明
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="一句话说明这个模板"
            />
          </label>
        </div>

        <div className="template-fields-head">
          <span>字段</span>
          <div className="fields-actions">
            <button type="button" className="button small soft" onClick={() => add('text')}>
              <PlusIcon size={14} />
              文本字段
            </button>
            <button type="button" className="button small soft" onClick={() => add('file')}>
              <PlusIcon size={14} />
              文件字段
            </button>
          </div>
        </div>

        <div className="template-field-list">
          {fields.map((field, index) => (
            <div className="template-field-row" key={index}>
              <input
                className="tf-key"
                value={field.key}
                placeholder="字段名"
                onChange={(event) =>
                  update(index, (current) => ({ ...current, key: event.target.value }))
                }
              />
              <select
                className="tf-kind"
                value={field.kind}
                onChange={(event) =>
                  update(index, (current) => ({
                    ...current,
                    kind: event.target.value === 'file' ? 'file' : 'text',
                  }))
                }
              >
                <option value="text">文本</option>
                <option value="file">文件</option>
              </select>
              <input
                className="tf-hint"
                value={field.hint ?? ''}
                placeholder="填写提示（可选）"
                onChange={(event) =>
                  update(index, (current) => ({
                    ...current,
                    hint: event.target.value || undefined,
                  }))
                }
              />
              <div className="tf-actions">
                <button
                  type="button"
                  className="icon-button tiny"
                  title="上移"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  <UpIcon size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button tiny"
                  title="下移"
                  onClick={() => move(index, 1)}
                  disabled={index === fields.length - 1}
                >
                  <DownIcon size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button tiny"
                  title="删除字段"
                  onClick={() => remove(index)}
                >
                  <XIcon size={14} />
                </button>
              </div>
            </div>
          ))}
          {fields.length === 0 && <p className="empty-hint">还没有字段。添加文本或文件字段。</p>}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button ghost" onClick={onDone}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存模板
          </button>
        </div>
      </form>
    </div>
  )
}
