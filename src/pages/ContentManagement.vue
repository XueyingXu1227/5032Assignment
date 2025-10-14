<script setup>
import { ref } from 'vue'
import { sendBulkEmail } from '@/services/email.js'

import { db } from '@/firebase/init'
import { collection, where, query, getDocs } from 'firebase/firestore'
import { sendEmail, textToBase64 } from '@/services/email'

const recipientsText = ref('')
const subject = ref('')
const html = ref('<p>Hello everyone,</p><p>...</p>')
const sending = ref(false)
const lastResult = ref(null)

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function resolveUserIdsFromEmails(emails) {
  if (!emails.length) return []
  const ids = []

  for (const batch of chunk(emails, 10)) {
    const qs = query(collection(db, 'users'), where('email', 'in', batch))
    const snap = await getDocs(qs)
    snap.forEach((d) => ids.push(d.id))
  }
  return [...new Set(ids)]
}

async function onSendBulk() {
  try {
    sending.value = true

    const emails = recipientsText.value
      .split(/[\n,; ]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    const userIds = await resolveUserIdsFromEmails(emails)

    const resp = await sendBulkEmail({
      userIds,
      subject: subject.value,
      html: html.value,
      storageAttachments: [
        { path: 'attachments/news.pdf', filename: 'news.pdf', type: 'application/pdf' },
      ],
      attachments: [{ filename: 'note.txt', type: 'text/plain', content: 'BASE64_STRING' }],
    })

    lastResult.value = resp
    alert(`Bulk sent   successes: ${resp.sent}  abortive: ${resp.failed}`)
  } catch (e) {
    alert(`Send Failure：${e.message}`)
  } finally {
    sending.value = false
  }
}

async function sendOneWithAttachment() {
  await sendEmail({
    to: 'Your email@example.com',
    subject: 'D.2 Attachment test',
    html: '<p>Here is an attachment.</p>',
    attachments: [
      {
        filename: 'note.txt',
        type: 'text/plain',
        content: textToBase64('hello from FIT5032'),
      },
    ],
  })
  alert('Single issue with attachment: sent')
}
</script>

<template>
  <div class="container py-4">
    <h2 class="mb-3">Admin · Bulk Email mass mailing</h2>

    <div class="card shadow-sm">
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label">Recipient's e-mail (line feed/comma/space delimited)</label>
          <textarea
            v-model="recipientsText"
            class="form-control"
            rows="5"
            placeholder="a@xx.com, b@xx.com&#10;c@xx.com"
          ></textarea>
          <div class="form-text">
            It is recommended to eventually use the "uid list of selected users" to distribute; here
            we use mailbox→uid to parse the demo for the time being.
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">Subject</label>
          <input v-model="subject" class="form-control" placeholder="Monthly Update" />
        </div>

        <div class="mb-3">
          <label class="form-label">HTML main text</label>
          <textarea
            v-model="html"
            class="form-control"
            rows="8"
            placeholder="<p>Hello...</p>"
          ></textarea>
        </div>

        <button class="btn btn-primary" :disabled="sending" @click="onSendBulk">
          {{ sending ? 'Sending…' : 'Send Bulk Email' }}
        </button>
        <button class="btn btn-secondary mt-3" @click="sendOneWithAttachment">
          Test single + attachment
        </button>

        <div v-if="lastResult" class="alert alert-light mt-3 mb-0">
          <div class="fw-bold">Job Result</div>
          <div>
            sent: {{ lastResult.sent }} | failed: {{ lastResult.failed }} | jobId:
            {{ lastResult.jobId }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px;
}
</style>
