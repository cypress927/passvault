import { useState, type FormEvent } from 'react'

interface PromptDialogProps {
  title: string
  label: string
  initialValue?: string
  submitLabel?: string
  onSubmit: (value: string) => void
  onClose: () => void
}

export function PromptDialog({
  title,
  label,
  initialValue = '',
  submitLabel = '保存',
  onSubmit,
  onClose,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('请输入名称')
      return
    }
    onSubmit(trimmed)
  }

  return (
    <div className="modal" onClick={onClose}>
      <form className="dialog" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <h3>{title}</h3>
        <label className="field-label">
          {label}
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="名称"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
