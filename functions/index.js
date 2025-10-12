const { setGlobalOptions } = require('firebase-functions/v2')
const { onRequest } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const functions = require('firebase-functions')
const sgMail = require('@sendgrid/mail')
const cors = require('cors')({ origin: true })

setGlobalOptions({ region: 'us-central1', maxInstances: 2 })

let cfg = {}
try {
  cfg = functions && functions.config && functions.config() ? functions.config() : {}
} catch (_) {
  cfg = {}
}
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || (cfg.sendgrid && cfg.sendgrid.key) || ''
const SENDGRID_SENDER = process.env.SENDGRID_SENDER || (cfg.sendgrid && cfg.sendgrid.sender) || ''

if (!SENDGRID_API_KEY || !SENDGRID_SENDER) {
  logger.warn(
    'SendGrid is not fully configured. ' +
      'Missing SENDGRID_API_KEY or SENDGRID_SENDER. ' +
      'Please set via: firebase functions:config:set sendgrid.key="..." sendgrid.sender="...".',
  )
} else {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

exports.health = onRequest((req, res) => {
  res.status(200).send({ ok: true, msg: 'Function is alive.' })
})

exports.sendMail = onRequest({ region: 'us-central1' }, (req, res) => {
  cors(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')

    if (req.method === 'OPTIONS') return res.status(204).send('')

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Use POST method.' })
    }

    if (!SENDGRID_API_KEY || !SENDGRID_SENDER) {
      logger.warn('SendGrid not configured: missing API KEY or SENDER')
      return res.status(500).json({ ok: false, error: 'SendGrid is not configured.' })
    }

    const { to, subject, text, html, attachments = [] } = req.body || {}
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: to, subject, and at least one of text/html.',
      })
    }

    const toList = Array.isArray(to)
      ? to
      : String(to)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

    try {
      sgMail.setApiKey(SENDGRID_API_KEY)

      const sgAttachments = (attachments || []).map((att) => ({
        filename: att.filename,
        type: att.type || 'application/octet-stream',
        content: att.content, // base64
        disposition: 'attachment',
      }))

      const msg = {
        to: toList,
        from: SENDGRID_SENDER,
        subject,
        text: text || undefined,
        html: html || undefined,
        attachments: sgAttachments.length ? sgAttachments : undefined,
      }

      await sgMail.send(msg)
      res.json({ ok: true })
    } catch (err) {
      logger.error('SendGrid error', err)
      const detail = err?.response?.body || err?.message || String(err)
      res.status(500).json({ ok: false, error: 'Send failed', detail })
    }
  })
})
