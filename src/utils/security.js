export const normalizeUsername = (name) => (name || '').trim().replace(/[^a-zA-Z0-9_]/g, '')

// Web Crypto - SHA-256
export async function sha256(str) {
  const data = new TextEncoder().encode(str)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
