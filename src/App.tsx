import { useEffect } from 'react'
import { useVaultApp } from './state/useVaultApp'
import { Welcome } from './ui/Welcome'
import { Workspace } from './ui/Workspace'
import { XIcon } from './ui/icons'

export function App() {
  const app = useVaultApp()

  useEffect(() => {
    if (!app.notice) return
    const timer = setTimeout(app.dismissNotice, 5000)
    return () => clearTimeout(timer)
  }, [app.notice, app.dismissNotice])

  return (
    <div className="app">
      {app.error ? (
        <div className="toast" role="alert">
          <span className="toast-dot" />
          <span className="toast-text">{app.error}</span>
          <button className="icon-button" onClick={app.dismissError} aria-label="关闭">
            <XIcon size={15} />
          </button>
        </div>
      ) : app.notice ? (
        <div className="toast success" role="status">
          <span className="toast-dot" />
          <span className="toast-text">{app.notice}</span>
          <button className="icon-button" onClick={app.dismissNotice} aria-label="关闭">
            <XIcon size={15} />
          </button>
        </div>
      ) : null}
      {app.screen === 'welcome' ? <Welcome app={app} /> : <Workspace app={app} />}
      {app.busy && (
        <div className="busy-pill">
          <span className="busy-spinner" />
          {app.busy}
        </div>
      )}
    </div>
  )
}
