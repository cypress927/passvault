import { useMemo } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { itemsWithTotp, totpFieldsOf, usernameOf } from '../vault/otpView'
import { ChevronLeftIcon, ShieldIcon } from './icons'
import { TotpCode } from './TotpCode'

export function OtpView({
  app,
  onBack,
  onOpenItem,
}: {
  app: AppApi
  onBack: () => void
  onOpenItem: (id: string) => void
}) {
  const entries = useMemo(() => itemsWithTotp(app.items), [app.items])

  return (
    <main className="otp-view">
      <header className="otp-head">
        <button className="button ghost" onClick={onBack}>
          <ChevronLeftIcon size={18} />
          条目
        </button>
        <div className="otp-head-text">
          <h2>验证码</h2>
          <p>{entries.length} 个条目包含 TOTP 字段</p>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="otp-empty">
          <span className="placeholder-icon">
            <ShieldIcon size={22} />
          </span>
          <p>没有包含 TOTP 字段的条目</p>
          <span>在条目的字段类型里选择 TOTP 后，会出现在这里</span>
        </div>
      ) : (
        <div className="otp-grid">
          {entries.map((item) => {
            const fields = totpFieldsOf(item)
            const username = usernameOf(item)
            return (
              <section className="otp-card" key={item.id}>
                <button
                  className="otp-card-open"
                  onClick={() => onOpenItem(item.id)}
                  title="打开条目"
                >
                  <span className="otp-card-name">{item.name || '未命名条目'}</span>
                  {username && <span className="otp-card-user">{username}</span>}
                </button>
                <div className="otp-fields">
                  {fields.map((field, index) => (
                    <div className="otp-field" key={index}>
                      {fields.length > 1 && (
                        <span className="otp-field-key">{field.key || 'TOTP'}</span>
                      )}
                      <TotpCode secret={field.secret} variant="card" />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
