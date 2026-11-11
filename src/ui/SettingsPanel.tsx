import type { AppApi } from '../state/useVaultApp'
import {
  CopyIcon,
  DownloadIcon,
  EditIcon,
  FolderIcon,
  LockIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from './icons'

export type SettingsFolderDialog =
  | { mode: 'create' }
  | { mode: 'rename'; id: string; name: string }

export function SettingsPanel({
  app,
  onImportCsv,
  onDedupe,
  onFolderDialog,
}: {
  app: AppApi
  onImportCsv: () => void
  onDedupe: () => void
  onFolderDialog: (dialog: SettingsFolderDialog) => void
}) {
  const busy = app.busy !== null

  return (
    <div className="view-screen">
      <header className="view-header">
        <h1>设置</h1>
      </header>

      <div className="view-list">
        <section className="view-section">
          <h2 className="view-section-title">库文件</h2>
          <div className="view-card">
            <div className="settings-kv">
              <span>文件</span>
              <span className="settings-kv-value">{app.session?.filename}</span>
            </div>
            <div className="settings-kv">
              <span>状态</span>
              <span>{app.session?.dirty ? '未导出' : '已导出'}</span>
            </div>
            <div className="settings-kv">
              <span>内容</span>
              <span>
                {app.items.length} 个条目 · {app.folders.length} 个文件夹
              </span>
            </div>
          </div>
        </section>

        <section className="view-section">
          <h2 className="view-section-title">操作</h2>
          <div className="view-card">
            <button
              className="settings-action"
              onClick={() => void app.exportCurrent()}
              disabled={busy}
            >
              <DownloadIcon size={18} />
              导出加密文件
            </button>
            <button className="settings-action" onClick={onImportCsv} disabled={busy}>
              <UploadIcon size={18} />
              导入 KeePass CSV
            </button>
            <button className="settings-action" onClick={app.lock} disabled={busy}>
              <LockIcon size={18} />
              锁定并返回欢迎页
            </button>
          </div>
        </section>

        <section className="view-section">
          <h2 className="view-section-title">文件夹</h2>
          <div className="view-card">
            {app.folders.map((folder) => (
              <div className="settings-folder-row" key={folder.id}>
                <FolderIcon size={17} />
                <span className="settings-folder-name">{folder.name}</span>
                <span className="settings-folder-count">
                  {app.items.filter((item) => item.folderId === folder.id).length}
                </span>
                <button
                  className="icon-button tiny"
                  onClick={() =>
                    onFolderDialog({ mode: 'rename', id: folder.id, name: folder.name })
                  }
                  aria-label={`重命名 ${folder.name}`}
                >
                  <EditIcon size={15} />
                </button>
                <button
                  className="icon-button tiny"
                  onClick={() => app.deleteFolder(folder.id)}
                  aria-label={`删除 ${folder.name}`}
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            ))}
            <button
              className="settings-action"
              onClick={() => onFolderDialog({ mode: 'create' })}
            >
              <PlusIcon size={18} />
              新建文件夹
            </button>
          </div>
        </section>

        <section className="view-section">
          <h2 className="view-section-title">工具</h2>
          <div className="view-card">
            <button className="settings-action" onClick={onDedupe} disabled={busy}>
              <CopyIcon size={18} />
              去重
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
