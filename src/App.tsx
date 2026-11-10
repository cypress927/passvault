import { useVaultApp } from './state/useVaultApp'
import { Welcome } from './ui/Welcome'
import { Workspace } from './ui/Workspace'
import { XIcon } from './ui/icons'

export function App() {
  const app = useVaultApp()

  return (
    <div className="app">
      {app.error && (
        <div className="toast" role="alert">
          <span className="toast-dot" />
          <span className="toast-text">{app.error}</span>
          <button className="icon-button" onClick={app.dismissError} aria-label="关闭">
            <XIcon size={15} />
          </button>
        </div>
      )}
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
