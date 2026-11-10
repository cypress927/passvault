import { useState, type FormEvent } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { formatSize } from './FieldRow'
import { LogoMark, PlusIcon, UploadIcon } from './icons'

export function Welcome({ app }: { app: AppApi }) {
  const [mode, setMode] = useState<'create' | 'import'>('create')

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-brand">
          <LogoMark size={40} />
          <div>
            <h1>passmgmt</h1>
            <p>本地加密资源库</p>
          </div>
        </div>

        <section className="auth-panel">
          <div className="segmented" role="tablist" aria-label="打开方式">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create'}
              className={mode === 'create' ? 'active' : ''}
              onClick={() => setMode('create')}
            >
              <PlusIcon size={15} />
              新建
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'import'}
              className={mode === 'import' ? 'active' : ''}
              onClick={() => setMode('import')}
            >
              <UploadIcon size={15} />
              导入
            </button>
          </div>

          {mode === 'create' ? <CreateForm app={app} /> : <ImportForm app={app} />}

          <p className="auth-foot warning">
            <span className="note-dot" />
            密码丢失后数据无法恢复
          </p>
        </section>
      </div>
    </div>
  )
}

function CreateForm({ app }: { app: AppApi }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!password) {
      setFormError('请输入密码')
      return
    }
    if (password !== confirm) {
      setFormError('两次输入的密码不一致')
      return
    }
    setFormError(null)
    void app.create(password)
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form-head">
        <h2>新建一个库</h2>
      </div>
      <label className="field-label">
        密码
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="设置一个密码"
          disabled={app.busy !== null}
        />
      </label>
      <label className="field-label">
        再输入一次
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          placeholder="确认密码"
          disabled={app.busy !== null}
        />
      </label>
      {formError && <p className="form-error">{formError}</p>}
      <button className="button primary large block" type="submit" disabled={app.busy !== null}>
        创建库
      </button>
    </form>
  )
}

function ImportForm({ app }: { app: AppApi }) {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setFormError('请先选择一个数据文件')
      return
    }
    if (!password) {
      setFormError('请输入密码')
      return
    }
    setFormError(null)
    void app.importFile(file, password)
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form-head">
        <h2>打开已有的库</h2>
      </div>
      <label className="file-picker">
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={app.busy !== null}
        />
        <span className="file-picker-icon">
          <UploadIcon size={18} />
        </span>
        <span className="file-picker-text">
          <strong>{file ? file.name : '选择一个 .vault 文件'}</strong>
          <span>{file ? formatSize(file.size) : '点击选择文件'}</span>
        </span>
      </label>
      <label className="field-label">
        密码
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="输入密码"
          disabled={app.busy !== null}
        />
      </label>
      {formError && <p className="form-error">{formError}</p>}
      <button className="button primary large block" type="submit" disabled={app.busy !== null}>
        解密并打开
      </button>
    </form>
  )
}
