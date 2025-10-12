const MAIL_ENDPOINT = 'https://us-central1-fit5032assessment-xu.cloudfunctions.net/sendMail'

export async function sendEmail({ to, subject, text, html, attachments = [] }) {
  const res = await fetch(MAIL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, text, html, attachments }),
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Email failed: ${msg}`)
  }

  try {
    return await res.json()
  } catch {
    return null
  }
}

export function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function textToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)))
}
