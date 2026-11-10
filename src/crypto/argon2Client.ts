import { deriveKek, type KdfParams } from './kdf'

interface KdfResponse {
  ok: boolean
  key?: Uint8Array
  error?: string
}

/**
 * Runs Argon2id off the main thread so unlocking doesn't freeze the UI.
 * Tests and non-browser environments run it inline; the browser always uses the Worker.
 */
export function deriveKekInWorker(
  password: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<Uint8Array> {
  if (typeof window === 'undefined') {
    return deriveKek(password, salt, params)
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./argon2.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<KdfResponse>) => {
      worker.terminate()
      const data = event.data
      if (data.ok && data.key) {
        resolve(data.key)
      } else {
        reject(new Error(data.error ?? 'Argon2id 计算失败'))
      }
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Argon2id 计算失败'))
    }
    worker.postMessage({ password, salt, params })
  })
}
