import type { Item } from './model'

/**
 * Field keys used to find the account identifier shown in the OTP view,
 * in priority order. Matching is exact (case-insensitive) on the key and
 * only considers text fields with a non-empty value. A field named
 * anything else is not treated as a username.
 */
export const USERNAME_FIELD_KEYS = [
  '用户名',
  '账号',
  '邮箱地址',
  '手机号',
  '登录名',
  'username',
  'account',
  'email',
] as const

export function usernameOf(item: Item): string {
  for (const key of USERNAME_FIELD_KEYS) {
    const match = item.fields.find(
      (field) =>
        field.value.kind === 'text' &&
        field.key.trim().toLowerCase() === key &&
        field.value.text.trim() !== '',
    )
    if (match && match.value.kind === 'text') return match.value.text
  }
  return ''
}

/** Items that have at least one field of type totp, in vault order. */
export function itemsWithTotp(items: Item[]): Item[] {
  return items.filter((item) => item.fields.some((field) => field.value.kind === 'totp'))
}

export interface TotpFieldView {
  key: string
  secret: string
}

/** TOTP fields of an item with their keys, in field order. */
export function totpFieldsOf(item: Item): TotpFieldView[] {
  return item.fields.flatMap((field) =>
    field.value.kind === 'totp' ? [{ key: field.key, secret: field.value.text }] : [],
  )
}
