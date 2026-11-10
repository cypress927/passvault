import { deriveKek, type KdfParams } from './kdf'

interface KdfResponse {
  ok: boolean
  key?: Uint8Array
  error?: string
}

/**
 * Runs Argon2id off the main thread so unlocking doesn't freeze the UI.
 * Tests and non-browser environments run it inline; the browser uses the
 * inline Worker, which keeps the single-file build self-contained.
 */
export async function deriveKekInWorker(
  password: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<Uint8Array> {
  if (typeof window === 'undefined') {
    return deriveKek(password, salt, params)
  }

  const { default: Argon2Worker } = await import('./argon2.worker?worker&inline')

  return new Promise((resolve, reject) => {
    const worker = new Argon2Worker()
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
