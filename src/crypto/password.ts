export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: true,
}

const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
}

const AMBIGUOUS = new Set(Array.from('0O1lI|'))

function randomInt(max: number): number {
  if (max <= 0) throw new Error('字符集为空')
  const limit = Math.floor(0x100000000 / max) * max
  const buffer = new Uint32Array(1)
  let value = 0
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return value % max
}

function pick(set: string): string {
  return set[randomInt(set.length)]
}

function shuffle(chars: string[]): string[] {
  for (let index = chars.length - 1; index > 0; index--) {
    const target = randomInt(index + 1)
    const temp = chars[index]
    chars[index] = chars[target]
    chars[target] = temp
  }
  return chars
}

function filtered(set: string, excludeAmbiguous: boolean): string {
  if (!excludeAmbiguous) return set
  return Array.from(set)
    .filter((char) => !AMBIGUOUS.has(char))
    .join('')
}

export function generatePassword(options: PasswordOptions): string {
  if (!Number.isInteger(options.length) || options.length < 4 || options.length > 128) {
    throw new Error('密码长度必须在 4 到 128 之间')
  }

  const pools: string[] = []
  if (options.lowercase) pools.push(filtered(SETS.lowercase, options.excludeAmbiguous))
  if (options.uppercase) pools.push(filtered(SETS.uppercase, options.excludeAmbiguous))
  if (options.digits) pools.push(filtered(SETS.digits, options.excludeAmbiguous))
  if (options.symbols) pools.push(filtered(SETS.symbols, options.excludeAmbiguous))

  if (pools.length === 0) {
    throw new Error('至少选择一种字符')
  }
  if (options.length < pools.length) {
    throw new Error('密码长度小于已选字符集的类别数')
  }

  const all = pools.join('')
  const chars = pools.map((pool) => pick(pool))
  while (chars.length < options.length) {
    chars.push(pick(all))
  }

  return shuffle(chars).join('')
}
