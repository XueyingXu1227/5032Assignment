<script setup>
import { ref } from 'vue'
import { sendEmail, textToBase64, arrayBufferToBase64 } from '@/services/email'

const toCsv = ref('')
const subject = ref('Announcement')
const html = ref('<p>Hello all,</p><p>...</p>')

async function send() {
  try {
    await sendEmail({
      to: toCsv.value,
      subject: subject.value,
      html: html.value,
      attachments: [],
    })
    alert('Sent')
  } catch (e) {
    console.error(e)
    alert('Send failed')
  }
}
</script>

<template>
  <div class="container mt-5">
    <h2>Admin: Content Management</h2>

    <div class="card p-3 mt-3">
      <h5>Bulk Email (paste recipients)</h5>

      <div class="mb-2">
        <label class="form-label">Recipients (comma separated)</label>
        <textarea
          class="form-control"
          rows="2"
          v-model="toCsv"
          placeholder="user1@example.com, user2@example.com"
        />
      </div>

      <div class="mb-2">
        <label class="form-label">Subject</label>
        <input class="form-control" v-model="subject" placeholder="Subject" />
      </div>

      <div class="mb-2">
        <label class="form-label">Message (HTML allowed)</label>
        <textarea class="form-control" rows="3" v-model="html" />
      </div>

      <button class="btn btn-primary" @click="send">Send</button>
    </div>
  </div>
</template>
