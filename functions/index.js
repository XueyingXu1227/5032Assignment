const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const sgMail = require('@sendgrid/mail')
const cors = require('cors')({ origin: true })

setGlobalOptions({ region: 'us-central1' })

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const FROM_EMAIL = defineSecret('FROM_EMAIL')

exports.ping = onRequest((req, res) => {
  res.status(200).send('pong  Cloud Functions are alive!')
})

exports.sendEmail = onRequest({ secrets: [SENDGRID_API_KEY, FROM_EMAIL] }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' })
      }

      const { to, subject, html } = req.body || {}
      if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      sgMail.setApiKey(SENDGRID_API_KEY.value())
      await sgMail.send({
        to,
        from: FROM_EMAIL.value(),
        subject,
        html,
      })

      console.log(` Email sent successfully to ${to}`)
      return res.status(200).json({ ok: true, message: `Email sent to ${to}` })
    } catch (err) {
      console.error(' Error sending email:', err)
      return res.status(500).json({ ok: false, error: err.message })
    }
  })
})
