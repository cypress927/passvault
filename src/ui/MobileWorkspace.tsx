import { useEffect, useState } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { CsvImportDialog } from './CsvImportDialog'
import { DedupeDialog } from './DedupeDialog'
import { ItemEditor } from './ItemEditor'
import { OtpView } from './OtpView'
import { PromptDialog } from './PromptDialog'
import { SettingsPanel, type SettingsFolderDialog } from './SettingsPanel'
import { TemplatePicker } from './TemplatePicker'
import { VaultList } from './VaultList'
import { ChevronLeftIcon, FileIcon, GearIcon, ShieldIcon } from './icons'

type Tab = 'vault' | 'otp' | 'settings'

export function MobileWorkspace({ app }: { app: AppApi }) {
  const [tab, setTab] = useState<Tab>('vault')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [dedupeOpen, setDedupeOpen] = useState(false)
  const [folderDialog, setFolderDialog] = useState<SettingsFolderDialog | null>(null)

  // Mobile has no folder filter; new items start ungrouped and can be moved
  // from the item page.
  useEffect(() => {
    app.setActiveFolder('all')
  }, [app.setActiveFolder])

  const selected = app.selectedItem
  if (selected) {
    return (
      <div className="mobile-app">
        <header className="mobile-item-bar">
          <button
            className="mobile-bar-button"
            onClick={() => app.select(null)}
            aria-label="返回列表"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <span className="mobile-bar-title">{selected.name || '未命名条目'}</span>
        </header>
        <div className="mobile-item-scroll">
          <ItemEditor app={app} item={selected} />
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-app">
      {tab === 'vault' && (
        <VaultList app={app} layout="mobile" onNew={() => setPickerOpen(true)} />
      )}
      {tab === 'otp' && (
        <OtpView
          app={app}
          onOpenItem={(id) => {
            app.select(id)
            setTab('vault')
          }}
        />
      )}
      {tab === 'settings' && (
        <SettingsPanel
          app={app}
          onImportCsv={() => setCsvOpen(true)}
          onDedupe={() => setDedupeOpen(true)}
          onFolderDialog={setFolderDialog}
        />
      )}

      <nav className="mobile-tabs" role="tablist" aria-label="主导航">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vault'}
          className={`mobile-tab${tab === 'vault' ? ' active' : ''}`}
          onClick={() => setTab('vault')}
        >
          <FileIcon size={21} />
          <span>条目</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'otp'}
          className={`mobile-tab${tab === 'otp' ? ' active' : ''}`}
          onClick={() => setTab('otp')}
        >
          <ShieldIcon size={21} />
          <span>验证码</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settings'}
          className={`mobile-tab${tab === 'settings' ? ' active' : ''}`}
          onClick={() => setTab('settings')}
        >
          <GearIcon size={21} />
          <span>设置</span>
        </button>
      </nav>

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
