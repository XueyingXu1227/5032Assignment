import { getAuth } from 'firebase/auth'

const BASE = import.meta.env.VITE_FUNCTIONS_BASE

export async function sendEmail({ to, subject, html, attachments = [] }) {
  const auth = getAuth()
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : ''

  const res = await fetch(`${BASE}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ to, subject, html, attachments }),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
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
