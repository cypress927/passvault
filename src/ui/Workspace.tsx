import { useState } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { CsvImportDialog } from './CsvImportDialog'
import { DedupeDialog } from './DedupeDialog'
import { ItemEditor } from './ItemEditor'
import { MobileWorkspace } from './MobileWorkspace'
import { OtpView } from './OtpView'
import { PromptDialog } from './PromptDialog'
import { SettingsPanel, type SettingsFolderDialog } from './SettingsPanel'
import { TemplatePicker } from './TemplatePicker'
import { VaultList } from './VaultList'
import { useIsMobile } from './useIsMobile'
import {
  FileIcon,
  FolderIcon,
  GearIcon,
  LockIcon,
  LogoMark,
  PlusIcon,
  ShieldIcon,
} from './icons'

type View = 'vault' | 'otp' | 'settings'

export function Workspace({ app }: { app: AppApi }) {
  const mobile = useIsMobile()
  return mobile ? <MobileWorkspace app={app} /> : <DesktopWorkspace app={app} />
}

function DesktopWorkspace({ app }: { app: AppApi }) {
  const [view, setView] = useState<View>('vault')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [dedupeOpen, setDedupeOpen] = useState(false)
  const [folderDialog, setFolderDialog] = useState<SettingsFolderDialog | null>(null)
  const ungroupedCount = app.items.filter((item) => item.folderId === null).length

  const navItem = (target: View) =>
    `desktop-nav-item${view === target ? ' active' : ''}`
  const folderItem = (filter: string) =>
    `desktop-folder${app.activeFolder === filter ? ' active' : ''}`

  return (
    <div className="desktop-app">
      <aside className="desktop-nav">
        <div className="desktop-brand">
          <LogoMark size={26} />
          <span>passmgmt</span>
        </div>

        <nav className="desktop-nav-items" aria-label="主导航">
          <button className={navItem('vault')} onClick={() => setView('vault')}>
            <FileIcon size={17} />
            条目
          </button>
          <button className={navItem('otp')} onClick={() => setView('otp')}>
            <ShieldIcon size={17} />
            验证码
          </button>
          <button className={navItem('settings')} onClick={() => setView('settings')}>
            <GearIcon size={17} />
            设置
          </button>
        </nav>

        <div className="desktop-folders">
          <div className="desktop-folders-head">
            <span>文件夹</span>
            <button
              className="icon-button tiny"
              title="新建文件夹"
              onClick={() => setFolderDialog({ mode: 'create' })}
            >
              <PlusIcon size={14} />
            </button>
          </div>
          <button
            className={folderItem('all')}
            onClick={() => {
              app.setActiveFolder('all')
              setView('vault')
            }}
          >
            <span className="desktop-folder-dot" />
            <span className="desktop-folder-name">全部条目</span>
            <span className="desktop-folder-count">{app.items.length}</span>
          </button>
          <button
            className={folderItem('none')}
            onClick={() => {
              app.setActiveFolder('none')
              setView('vault')
            }}
          >
            <span className="desktop-folder-dot none" />
            <span className="desktop-folder-name">未分组</span>
            <span className="desktop-folder-count">{ungroupedCount}</span>
          </button>
          {app.folders.map((folder) => (
            <button
              key={folder.id}
              className={folderItem(folder.id)}
              onClick={() => {
                app.setActiveFolder(folder.id)
                setView('vault')
              }}
            >
              <FolderIcon size={15} />
              <span className="desktop-folder-name">{folder.name}</span>
              <span className="desktop-folder-count">
                {app.items.filter((item) => item.folderId === folder.id).length}
              </span>
            </button>
          ))}
        </div>

        <button className="desktop-lock" onClick={app.lock} disabled={app.busy !== null}>
          <LockIcon size={16} />
          锁定
        </button>
      </aside>

      {view === 'vault' ? (
        <>
          <section className="desktop-list">
            <VaultList app={app} layout="desktop" onNew={() => setPickerOpen(true)} />
          </section>
          <main className="desktop-detail">
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
        </>
      ) : view === 'otp' ? (
        <main className="desktop-main">
          <OtpView
            app={app}
            onOpenItem={(id) => {
              app.select(id)
              setView('vault')
            }}
          />
        </main>
      ) : (
        <main className="desktop-main">
          <SettingsPanel
            app={app}
            onImportCsv={() => setCsvOpen(true)}
            onDedupe={() => setDedupeOpen(true)}
            onFolderDialog={setFolderDialog}
          />
        </main>
      )}

      {pickerOpen && <TemplatePicker app={app} onClose={() => setPickerOpen(false)} />}
      {csvOpen && <CsvImportDialog app={app} onClose={() => setCsvOpen(false)} />}
      {dedupeOpen && <DedupeDialog app={app} onClose={() => setDedupeOpen(false)} />}
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
