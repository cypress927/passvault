import { useEffect, useState } from 'react'
import { generateTotp, parseTotpSecret, totpRemaining } from '../crypto/totp'

type State =
  | { status: 'empty' }
  | { status: 'invalid'; error: string }
  | { status: 'ok'; code: string; remaining: number; period: number; digits: number }

export function TotpCode({ secret }: { secret: string }) {
  const [state, setState] = useState<State>({ status: 'empty' })
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    if (secret.trim() === '') {
      setState({ status: 'empty' })
      return
    }

    const parsed = parseTotpSecret(secret)
    if (!parsed.ok) {
      setState({ status: 'invalid', error: parsed.error })
      return
    }

    let cancelled = false
    const update = async () => {
      const now = Math.floor(Date.now() / 1000)
      try {
        const code = await generateTotp(parsed.config, now)
        if (!cancelled) {
          setState({
            status: 'ok',
            code,
            remaining: totpRemaining(parsed.config.period, now),
            period: parsed.config.period,
            digits: parsed.config.digits,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'invalid',
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    void update()
    const timer = setInterval(() => void update(), 1000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [secret])

  const copy = async () => {
    if (state.status !== 'ok') return
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(state.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopyError('复制失败')
    }
  }

  if (state.status === 'empty') {
    return (
      <div className="totp-panel empty">
        <span>填入密钥后显示验证码</span>
      </div>
    )
  }

  if (state.status === 'invalid') {
    return (
      <div className="totp-panel invalid">
        <span>无法解析 TOTP 密钥</span>
        <small>{state.error}</small>
      </div>
    )
  }

  const formatted =
    state.digits === 8
      ? `${state.code.slice(0, 4)} ${state.code.slice(4)}`
      : `${state.code.slice(0, 3)} ${state.code.slice(3)}`

  return (
    <div className="totp-panel">
      <div className="totp-code">{formatted}</div>
      <div className="totp-bar">
        <span style={{ width: `${(state.remaining / state.period) * 100}%` }} />
      </div>
      <div className="totp-meta">
        <span>{state.remaining}s</span>
        <button className="button small ghost" onClick={copy}>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {copyError && <p className="form-error">{copyError}</p>}
    </div>
  )
}
