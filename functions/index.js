const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const functions = require('firebase-functions')
const sgMail = require('@sendgrid/mail')
const cors = require('cors')({ origin: true })

/* init Admin SDK (reuse app if already initialized) */
const admin = require('firebase-admin')
try {
  admin.app()
} catch {
  admin.initializeApp()
}
const db = admin.firestore()

/*  set default region for all HTTP functions */
setGlobalOptions({ region: 'us-central1' })

/*secrets for SendGrid key and From email */
const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const FROM_EMAIL = defineSecret('FROM_EMAIL')

/* verify Firebase ID token and read user's role */
async function getUserAndRole(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { uid: null, role: null }

  const decoded = await admin
    .auth()
    .verifyIdToken(token)
    .catch(() => null)
  if (!decoded?.uid) return { uid: null, role: null }

  const snap = await db.collection('users').doc(decoded.uid).get()
  const role = snap.exists ? snap.data().role || 'user' : 'user'
  return { uid: decoded.uid, role }
}

/* load files from Cloud Storage and encode as base64 */
async function fetchStorageAttachments(items = []) {
  if (!items || items.length === 0) return []
  const bucket = admin.storage().bucket()
  const out = []
  for (const it of items) {
    const file = bucket.file(it.path)
    const [exists] = await file.exists()
    if (!exists) throw new Error(`Storage file not found: ${it.path}`)
    const [buf] = await file.download()
    out.push({
      filename: it.filename || it.path.split('/').pop(),
      type: it.type || 'application/octet-stream',
      content: buf.toString('base64'),
      disposition: 'attachment',
    })
  }
  return out
}

/*send one email via SendGrid (CORS, POST only) */
exports.email = onRequest({ secrets: [SENDGRID_API_KEY, FROM_EMAIL] }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' })

      const { to, subject, html, attachments = [], storageAttachments = [] } = req.body || {}
      if (!to || !subject || !html)
        return res.status(400).json({ error: 'Missing: to/subject/html' })

      sgMail.setApiKey(SENDGRID_API_KEY.value())

      // base64 attachments from client
      const atts = (attachments || []).map((a) => ({
        filename: a.filename,
        type: a.type || 'application/octet-stream',
        content: a.content, // base64
        disposition: 'attachment',
      }))
      // attachments fetched from Cloud Storage
      const storageAtts = await fetchStorageAttachments(storageAttachments || [])

      await sgMail.send({
        to,
        from: FROM_EMAIL.value(),
        subject,
        html,
        attachments: [...atts, ...storageAtts],
      })

      functions.logger.info(`Email sent to ${to}`)
      return res.json({ ok: true })
    } catch (err) {
      functions.logger.error('send email error', err)
      return res.status(500).json({ ok: false, error: err.message })
    }
  })
})

/*admin-only mass send with basic job tracking */
exports.bulkEmail = onRequest({ secrets: [SENDGRID_API_KEY, FROM_EMAIL] }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' })

      /* only admin can bulk send */
      const { uid, role } = await getUserAndRole(req)
      if (!uid || role !== 'admin')
        return res.status(403).json({ error: 'Only admin can bulk send' })

      const {
        userIds = [],
        subject,
        html,
        attachments = [],
        storageAttachments = [],
      } = req.body || {}
      if (!userIds.length) return res.status(400).json({ error: 'Empty userIds' })
      if (!subject || !html) return res.status(400).json({ error: 'Missing subject/html' })

      sgMail.setApiKey(SENDGRID_API_KEY.value())

      // prepare attachments (client base64 + Cloud Storage)
      const storageAtts = await fetchStorageAttachments(storageAttachments || [])
      const base64Atts = (attachments || []).map((a) => ({
        filename: a.filename,
        type: a.type || 'application/octet-stream',
        content: a.content,
        disposition: 'attachment',
      }))
      const atts = [...base64Atts, ...storageAtts]

      /* create a simple job doc for progress */
      const docs = await db.getAll(...userIds.map((id) => db.collection('users').doc(id)))
      const emails = docs.map((d) => (d.exists ? d.data().email : null)).filter((e) => !!e)

      const jobRef = await db.collection('mail_jobs').add({
        createdBy: uid,
        subject,
        total: emails.length,
        ok: 0,
        fail: 0,
        status: 'sending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      let ok = 0,
        fail = 0
      for (const email of emails) {
        try {
          await sgMail.send({
            to: email,
            from: FROM_EMAIL.value(),
            subject,
            html,
            attachments: atts,
          })
          ok++
        } catch (e) {
          functions.logger.error(`bulk send fail -> ${email}`, e)
          fail++
          await jobRef.collection('fails').add({ email, error: e.message || String(e) })
        }
      }

      await jobRef.set({ status: 'sent', ok, fail }, { merge: true })
      return res.json({ ok: true, jobId: jobRef.id, sent: ok, failed: fail })
    } catch (err) {
      functions.logger.error('bulk email error', err)
      return res.status(500).json({ ok: false, error: err.message })
    }
  })
})
