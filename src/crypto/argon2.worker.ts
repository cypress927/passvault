import { deriveKek, type KdfParams } from './kdf'

export interface KdfRequest {
  password: string
  salt: Uint8Array
  params: KdfParams
}

type WorkerScope = {
  onmessage: ((event: MessageEvent<KdfRequest>) => void) | null
  postMessage: (message: unknown) => void
}

const scope = self as unknown as WorkerScope

scope.onmessage = async (event) => {
  const { password, salt, params } = event.data
  try {
    const key = await deriveKek(password, salt, params)
    scope.postMessage({ ok: true, key })
  } catch (error) {
    scope.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
