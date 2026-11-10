import { useState } from 'react'
import { randomId } from '../crypto/random'
import type { AppApi } from '../state/useVaultApp'
import type { Template } from '../vault/model'
import { TemplateEditor } from './TemplateEditor'
import { EditIcon, PlusIcon, TrashIcon, XIcon } from './icons'

export function TemplateManager({
  app,
  onBack,
  onClose,
}: {
  app: AppApi
  onBack: () => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<Template | null>(null)

  if (editing) {
    return (
      <TemplateEditor
        app={app}
        template={editing}
        onDone={() => setEditing(null)}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-panel template-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>我的模板</h2>
            <p>模板只保存字段结构，随库一起加密导出。</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <XIcon size={17} />
          </button>
        </div>

        <div className="manager-actions">
          <button className="button ghost" onClick={onBack}>
            返回选择
          </button>
          <button
            className="button primary"
            onClick={() =>
              setEditing({ id: randomId(), name: '', description: '', fields: [] })
            }
          >
            <PlusIcon size={15} />
            新建模板
          </button>
        </div>

        {app.templates.length === 0 ? (
          <p className="empty-hint">还没有自定义模板。新建一个，把常用字段存下来。</p>
        ) : (
          <ul className="manager-list">
            {app.templates.map((template) => (
              <li className="manager-row" key={template.id}>
                <div className="manager-info">
                  <strong>{template.name}</strong>
                  <span>{template.description || `${template.fields.length} 个字段`}</span>
                </div>
                <div className="manager-buttons">
                  <button className="button small ghost" onClick={() => setEditing(template)}>
                    <EditIcon size={14} />
                    编辑
                  </button>
                  <button
                    className="button small danger"
                    onClick={() => app.deleteTemplate(template.id)}
                  >
                    <TrashIcon size={14} />
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
