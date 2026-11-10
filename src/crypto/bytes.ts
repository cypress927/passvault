/**
 * WebCrypto's types require ArrayBuffer-backed views, while our byte arrays are
 * typed as ArrayBufferLike. The runtime never passes SharedArrayBuffer here.
 */
export function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource
}
