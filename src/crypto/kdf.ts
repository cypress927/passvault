import { argon2id } from 'hash-wasm'

export interface KdfParams {
  /** Memory cost in KiB. */
  memoryKiB: number
  iterations: number
  parallelism: number
}

export const DEFAULT_KDF: KdfParams = {
  memoryKiB: 65536,
  iterations: 3,
  parallelism: 1,
}

export async function deriveKek(
  password: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<Uint8Array> {
  return argon2id({
    password,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memoryKiB,
    hashLength: 32,
    outputType: 'binary',
  })
}
