import { useState } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { CsvImportDialog } from './CsvImportDialog'
import { ItemEditor } from './ItemEditor'
import { PromptDialog } from './PromptDialog'
import { TemplatePicker } from './TemplatePicker'
import {
  ChevronLeftIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  LockIcon,
  LogoMark,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
} from './icons'

type FolderDialog =
  | { mode: 'create' }
  | { mode: 'rename'; id: string; name: string }

export function Workspace({ app }: { app: AppApi }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const ungroupedCount = app.items.filter((item) => item.folderId === null).length

  return (
    <div className="workspace">
      <header className="toolbar">
        <div className="toolbar-brand">
          <LogoMark size={28} />
          <span className="toolbar-brand-name">passmgmt</span>
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
            className="button"
            aria-label="导入 CSV"
            title="导入 CSV"
            onClick={() => setCsvOpen(true)}
            disabled={app.busy !== null}
          >
            <UploadIcon size={16} />
            <span className="button-label">导入 CSV</span>
          </button>
          <button
            className="button primary"
            aria-label="导出"
            title="导出"
            onClick={() => void app.exportCurrent()}
            disabled={app.busy !== null}
          >
            <DownloadIcon size={16} />
            <span className="button-label">导出</span>
          </button>
          <button
            className="button ghost"
            aria-label="锁定"
            title="锁定"
            onClick={app.lock}
            disabled={app.busy !== null}
          >
            <LockIcon size={16} />
            <span className="button-label">锁定</span>
          </button>
        </div>
      </header>

      <div className={`workspace-body${app.selectedItem ? ' editing' : ''}`}>
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
            <button className="button primary block" onClick={() => setPickerOpen(true)}>
              <PlusIcon size={16} />
              新建条目
            </button>
          </div>

          <div className="folders-head">
            <span>文件夹</span>
            <button
              className="icon-button tiny"
              title="新建文件夹"
              onClick={() => setFolderDialog({ mode: 'create' })}
            >
              <PlusIcon size={15} />
            </button>
          </div>

          <div className="folder-list">
            <button
              className={`folder-item${app.activeFolder === 'all' ? ' active' : ''}`}
              onClick={() => app.setActiveFolder('all')}
            >
              <span className="folder-dot all" />
              <span className="folder-name">全部条目</span>
              <span className="folder-count">{app.items.length}</span>
            </button>
            <button
              className={`folder-item${app.activeFolder === 'none' ? ' active' : ''}`}
              onClick={() => app.setActiveFolder('none')}
            >
              <span className="folder-dot none" />
              <span className="folder-name">未分组</span>
              <span className="folder-count">{ungroupedCount}</span>
            </button>
            {app.folders.map((folder) => (
              <div
                className={`folder-row${app.activeFolder === folder.id ? ' active' : ''}`}
                key={folder.id}
              >
                <button className="folder-item" onClick={() => app.setActiveFolder(folder.id)}>
                  <FolderIcon size={15} />
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">
                    {app.items.filter((item) => item.folderId === folder.id).length}
                  </span>
                </button>
                <div className="folder-actions">
                  <button
                    className="icon-button tiny"
                    title="重命名"
                    onClick={() =>
                      setFolderDialog({ mode: 'rename', id: folder.id, name: folder.name })
                    }
                  >
                    <EditIcon size={13} />
                  </button>
                  <button
                    className="icon-button tiny"
                    title="删除文件夹（条目移到未分组）"
                    onClick={() => app.deleteFolder(folder.id)}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            ))}
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
                <span>
                  {app.query
                    ? '没有匹配的条目'
                    : app.activeFolder === 'all'
                      ? '还没有条目'
                      : '这里还没有条目'}
                </span>
              </li>
            )}
          </ul>
        </aside>

        <main className="editor-pane">
          {app.selectedItem ? (
            <>
              <div className="mobile-editor-bar">
                <button className="button ghost" onClick={() => app.select(null)}>
                  <ChevronLeftIcon size={18} />
                  返回列表
                </button>
              </div>
              <ItemEditor app={app} item={app.selectedItem} />
            </>
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

      {pickerOpen && <TemplatePicker app={app} onClose={() => setPickerOpen(false)} />}

      {csvOpen && <CsvImportDialog app={app} onClose={() => setCsvOpen(false)} />}

      {folderDialog && (
        <PromptDialog
          title={folderDialog.mode === 'create' ? '新建文件夹' : '重命名文件夹'}
          label="文件夹名称"
          initialValue={folderDialog.mode === 'rename' ? folderDialog.name : ''}
          submitLabel={folderDialog.mode === 'create' ? '创建' : '保存'}
          onSubmit={(name) => {
            if (folderDialog.mode === 'create') {
              app.addFolder(name)
            } else {
              app.renameFolder(folderDialog.id, name)
            }
            setFolderDialog(null)
          }}
          onClose={() => setFolderDialog(null)}
        />
      )}
    </div>
  )
}
