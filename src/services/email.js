console.log('VITE_FUNCTIONS_BASE =', import.meta.env.VITE_FUNCTIONS_BASE)
import { getAuth } from 'firebase/auth'

const DEFAULT_BASE = 'https://us-central1-fit5032assessment-xu.cloudfunctions.net'
const BASE = (import.meta.env && import.meta.env.VITE_FUNCTIONS_BASE) || DEFAULT_BASE
console.log('VITE_FUNCTIONS_BASE =', import.meta.env?.VITE_FUNCTIONS_BASE, '| BASE =', BASE)

async function authedFetch(path, payload) {
  const auth = getAuth()
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : ''
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `HTTP ${res.status}`)
  }
  return res.json()
}

export function sendEmail({ to, subject, html, attachments = [], storageAttachments = [] }) {
  return authedFetch('/email', { to, subject, html, attachments, storageAttachments })
}
export function sendBulkEmail({
  userIds,
  subject,
  html,
  attachments = [],
  storageAttachments = [],
}) {
  return authedFetch('/bulkEmail', { userIds, subject, html, attachments, storageAttachments })
}

export function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
export function textToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)))
}
