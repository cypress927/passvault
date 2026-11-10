import type { AppApi } from '../state/useVaultApp'
import { ItemEditor } from './ItemEditor'
import {
  DownloadIcon,
  FileIcon,
  LockIcon,
  LogoMark,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
} from './icons'

export function Workspace({ app }: { app: AppApi }) {
  return (
    <div className="workspace">
      <header className="toolbar">
        <div className="toolbar-brand">
          <LogoMark size={28} />
          <span>passmgmt</span>
        </div>
        <span className="toolbar-divider" />
        <div className="toolbar-file">
          <span className="filename">{app.session?.filename}</span>
          {app.session?.dirty ? (
            <span className="badge dirty">未导出</span>
          ) : (
            <span className="badge clean">已导出</span>
          )}
        </div>
        <div className="toolbar-actions">
          <button
            className="button primary"
            onClick={() => void app.exportCurrent()}
            disabled={app.busy !== null}
          >
            <DownloadIcon size={16} />
            导出
          </button>
          <button className="button ghost" onClick={app.lock} disabled={app.busy !== null}>
            <LockIcon size={16} />
            锁定
          </button>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="search-box">
              <SearchIcon size={16} />
              <input
                className="search"
                placeholder="搜索名称、描述、字段、附件名"
                value={app.query}
                onChange={(event) => app.setQuery(event.target.value)}
              />
            </div>
            <button className="button primary block" onClick={app.addItem}>
              <PlusIcon size={16} />
              新建条目
            </button>
          </div>

          <div className="list-meta">
            <span>条目</span>
            <span>{app.filteredItems.length}</span>
          </div>

          <ul className="item-list">
            {app.filteredItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`item-link${item.id === app.selectedId ? ' selected' : ''}`}
                  onClick={() => app.select(item.id)}
                  aria-current={item.id === app.selectedId}
                >
                  <span className="item-name">{item.name || '未命名条目'}</span>
                  <span className="item-desc">
                    {item.description || `${item.fields.length} 个字段`}
                  </span>
                </button>
              </li>
            ))}
            {app.filteredItems.length === 0 && (
              <li className="empty-list">
                <FileIcon size={20} />
                <span>{app.query ? '没有匹配的条目' : '还没有条目'}</span>
              </li>
            )}
          </ul>
        </aside>

        <main className="editor-pane">
          {app.selectedItem ? (
            <ItemEditor app={app} item={app.selectedItem} />
          ) : (
            <div className="placeholder">
              <span className="placeholder-icon">
                <ShieldIcon size={22} />
              </span>
              <p>没有选中的条目</p>
              <span>从左侧选择一个条目，或新建一个</span>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
