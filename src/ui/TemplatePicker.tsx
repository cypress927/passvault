import { useState } from 'react'
import type { AppApi } from '../state/useVaultApp'
import type { Template } from '../vault/model'
import { BUILTIN_TEMPLATES } from '../vault/builtinTemplates'
import { TemplateManager } from './TemplateManager'
import { FileIcon, PlusIcon, SearchIcon, XIcon } from './icons'

export function TemplatePicker({ app, onClose }: { app: AppApi; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [managing, setManaging] = useState(false)

  if (managing) {
    return <TemplateManager app={app} onBack={() => setManaging(false)} onClose={onClose} />
  }

  const matches = (template: Template) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return (
      template.name.toLowerCase().includes(needle) ||
      template.description.toLowerCase().includes(needle) ||
      template.fields.some((field) => field.key.toLowerCase().includes(needle))
    )
  }

  const builtins = BUILTIN_TEMPLATES.filter(matches)
  const mine = app.templates.filter(matches)

  const choose = (template: Template | null) => {
    app.createItem(template)
    onClose()
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-panel template-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>新建条目</h2>
            <p>选择一个模板，字段会拷贝到新条目；创建后互不影响。</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <XIcon size={17} />
          </button>
        </div>

        <div className="search-box template-search">
          <SearchIcon size={16} />
          <input
            className="search"
            placeholder="搜索模板名、说明或字段"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>

        <div className="template-scroll">
          <button className="template-card blank" onClick={() => choose(null)}>
            <span className="template-icon">
              <FileIcon size={17} />
            </span>
            <span className="template-name">空白条目</span>
            <span className="template-desc">不预设任何字段</span>
          </button>

          <h3 className="section-title">内置模板</h3>
          <div className="template-grid">
            {builtins.map((template) => (
              <TemplateCard key={template.id} template={template} onChoose={choose} />
            ))}
          </div>
          {builtins.length === 0 && <p className="empty-hint">没有匹配的内置模板。</p>}

          <div className="section-head">
            <h3 className="section-title">我的模板</h3>
            <button className="button small ghost" onClick={() => setManaging(true)}>
              管理模板
            </button>
          </div>

          <div className="template-grid">
            {mine.map((template) => (
              <TemplateCard key={template.id} template={template} onChoose={choose} />
            ))}
            <button className="template-card new" onClick={() => setManaging(true)}>
              <span className="template-icon">
                <PlusIcon size={17} />
              </span>
              <span className="template-name">新建模板</span>
              <span className="template-desc">自定义字段清单</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  onChoose,
}: {
  template: Template
  onChoose: (template: Template) => void
}) {
  const preview = template.fields
    .slice(0, 4)
    .map((field) => field.key)
    .join(' · ')

  return (
    <button className="template-card" onClick={() => onChoose(template)}>
      <span className="template-name">{template.name}</span>
      <span className="template-desc">{template.description || '自定义模板'}</span>
      <span className="template-fields">
        {preview}
        {template.fields.length > 4 ? ' …' : ''}
      </span>
      <span className="template-count">{template.fields.length} 个字段</span>
    </button>
  )
}
