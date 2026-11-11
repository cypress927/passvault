import type { AppApi } from '../state/useVaultApp'
import type { Item } from '../vault/model'
import { usernameOf } from '../vault/otpView'
import { matchesQuery } from '../vault/search'
import { FileIcon, PlusIcon, SearchIcon } from './icons'

function itemSubtitle(item: Item): string {
  const username = usernameOf(item)
  if (username) return username
  if (item.description.trim() !== '') return item.description
  return `${item.fields.length} 个字段`
}

function ItemRow({
  item,
  selected,
  onSelect,
}: {
  item: Item
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      className={`view-row${selected ? ' selected' : ''}`}
      onClick={onSelect}
    >
      <span className="view-avatar" aria-hidden="true">
        {item.name.trim().charAt(0) || '?'}
      </span>
      <span className="view-row-text">
        <span className="view-row-name">{item.name || '未命名条目'}</span>
        <span className="view-row-sub">{itemSubtitle(item)}</span>
      </span>
    </button>
  )
}

export function VaultList({
  app,
  layout,
  onNew,
}: {
  app: AppApi
  layout: 'mobile' | 'desktop'
  onNew: () => void
}) {
  const visible = app.items.filter((item) => matchesQuery(item, app.query))
  const grouped = layout === 'mobile'
  const sections = [
    {
      id: 'none',
      name: '未分组',
      items: visible.filter((item) => item.folderId === null),
    },
    ...app.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      items: visible.filter((item) => item.folderId === folder.id),
    })),
  ].filter((section) => section.items.length > 0)

  const empty =
    app.items.length === 0
      ? { title: '还没有条目', hint: '点「新建条目」开始' }
      : app.query
        ? { title: '没有匹配的条目', hint: '换个关键词试试' }
        : { title: '这里还没有条目', hint: '' }

  return (
    <div className="view-screen">
      <header className="view-header">
        <div className="view-title-row">
          <h1>资源库</h1>
          {app.session?.dirty ? (
            <span className="badge dirty">未导出</span>
          ) : (
            <span className="badge clean">已导出</span>
          )}
        </div>
        <p className="view-filename">{app.session?.filename}</p>
        <label className="view-search">
          <SearchIcon size={17} />
          <input
            className="search"
            placeholder="搜索名称、描述、字段、附件名"
            value={app.query}
            onChange={(event) => app.setQuery(event.target.value)}
          />
        </label>
        {layout === 'desktop' && (
          <button className="button primary block view-new" onClick={onNew}>
            <PlusIcon size={16} />
            新建条目
          </button>
        )}
      </header>

      <div className="view-list">
        {grouped ? (
          sections.length === 0 ? (
            <div className="view-empty">
              <FileIcon size={22} />
              <p>{empty.title}</p>
              <span>{empty.hint}</span>
            </div>
          ) : (
            sections.map((section) => (
              <section className="view-section" key={section.id}>
                <h2 className="view-section-title">
                  {section.name}
                  <span>{section.items.length}</span>
                </h2>
                <div className="view-card">
                  {section.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      selected={item.id === app.selectedId}
                      onSelect={() => app.select(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )
        ) : app.filteredItems.length === 0 ? (
          <div className="view-empty">
            <FileIcon size={22} />
            <p>{empty.title}</p>
            <span>{empty.hint}</span>
          </div>
        ) : (
          <div className="view-card">
            {app.filteredItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                selected={item.id === app.selectedId}
                onSelect={() => app.select(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {layout === 'mobile' && (
        <button className="mobile-fab" onClick={onNew} aria-label="新建条目">
          <PlusIcon size={25} />
        </button>
      )}
    </div>
  )
}
