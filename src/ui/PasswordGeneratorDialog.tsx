import { useMemo, useState } from 'react'
import { generatePassword, type PasswordOptions } from '../crypto/password'
import { XIcon } from './icons'

const PRESETS: Array<{ label: string; options: PasswordOptions }> = [
  {
    label: '强密码',
    options: {
      length: 20,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: true,
    },
  },
  {
    label: '兼容模式',
    options: {
      length: 16,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: false,
      excludeAmbiguous: true,
    },
  },
  {
    label: '纯数字 PIN',
    options: {
      length: 6,
      lowercase: false,
      uppercase: false,
      digits: true,
      symbols: false,
      excludeAmbiguous: false,
    },
  },
]

export function PasswordGeneratorDialog({
  options,
  onOptionsChange,
  onUse,
  onClose,
}: {
  options: PasswordOptions
  onOptionsChange: (options: PasswordOptions) => void
  onUse: (password: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<PasswordOptions>(options)
  const [nonce, setNonce] = useState(0)

  const result = useMemo(() => {
    try {
      return { password: generatePassword(draft), error: null as string | null }
    } catch (caught) {
      return {
        password: null as string | null,
        error: caught instanceof Error ? caught.message : String(caught),
      }
    }
  }, [draft, nonce])

  const update = (patch: Partial<PasswordOptions>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const use = () => {
    if (!result.password) return
    onOptionsChange(draft)
    onUse(result.password)
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="dialog generator-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="generator-head">
          <h3>生成密码</h3>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <XIcon size={17} />
          </button>
        </div>

        <div className="generator-preview">
          <code>{result.password ?? '—'}</code>
          <button
            className="button small ghost"
            onClick={() => setNonce((current) => current + 1)}
            disabled={!result.password}
          >
            重新生成
          </button>
        </div>

        {result.error && <p className="form-error">{result.error}</p>}

        <div className="generator-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="button small"
              onClick={() => setDraft(preset.options)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="generator-length">
          <span>
            长度 <strong>{draft.length}</strong>
          </span>
          <input
            type="range"
            min={6}
            max={64}
            value={draft.length}
            onChange={(event) => update({ length: Number(event.target.value) })}
          />
        </label>

        <div className="generator-checks">
          <label className="check">
            <input
              type="checkbox"
              checked={draft.lowercase}
              onChange={(event) => update({ lowercase: event.target.checked })}
            />
            小写字母
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.uppercase}
              onChange={(event) => update({ uppercase: event.target.checked })}
            />
            大写字母
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.digits}
              onChange={(event) => update({ digits: event.target.checked })}
            />
            数字
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.symbols}
              onChange={(event) => update({ symbols: event.target.checked })}
            />
            符号
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.excludeAmbiguous}
              onChange={(event) => update({ excludeAmbiguous: event.target.checked })}
            />
            排除易混淆字符
          </label>
        </div>

        <div className="dialog-actions">
          <button className="button ghost" onClick={onClose}>
            取消
          </button>
          <button className="button primary" onClick={use} disabled={!result.password}>
            使用这个密码
          </button>
        </div>
      </div>
    </div>
  )
}
