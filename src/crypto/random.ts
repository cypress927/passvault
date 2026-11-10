export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  crypto.getRandomValues(out)
  return out
}

export function randomId(): string {
  return crypto.randomUUID()
}
