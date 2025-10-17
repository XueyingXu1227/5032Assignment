<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { sendBulkEmail } from '@/services/email'
import { db } from '@/firebase/init'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

/* admin can pick users from a list.
   load users from Firestore for the dropdown. */
const loadingUsers = ref(true)
const users = ref([])
onMounted(async () => {
  const q = query(collection(db, 'users'), orderBy('email'))
  const snap = await getDocs(q)
  users.value = snap.docs.map((d) => {
    const data = d.data() || {}
    return { id: d.id, email: data.email || '(no email)', name: data.displayName || '' }
  })
  loadingUsers.value = false
})

/* multi-select UI for recipients (simple custom dropdown). */
const picker = reactive({
  open: false,
  filter: '',
  anchorEl: null,
})
const selectedIds = ref(new Set()) // Set<uid>
//Count of selected users, shown near chips or buttons.
const selectedCount = computed(() => selectedIds.value.size)
//Text filter for the dropdown list.
const filteredUsers = computed(() => {
  const f = picker.filter.trim().toLowerCase()
  if (!f) return users.value
  return users.value.filter(
    (u) => u.email.toLowerCase().includes(f) || (u.name && u.name.toLowerCase().includes(f)),
  )
})
//Open/close the dropdown and keep its anchor.
function openDropdown() {
  picker.open = true
}
function closeDropdown() {
  picker.open = false
}
function onFocusRecipients(e) {
  picker.anchorEl = e.target
  openDropdown()
}
function onInputRecipients(e) {
  picker.filter = e.target.value || ''
  openDropdown()
}
//Toggle one user in the selection.
function toggleOne(id) {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}
//Quick select：add all currently visible users.
function selectAllVisible() {
  const s = new Set(selectedIds.value)
  filteredUsers.value.forEach((u) => s.add(u.id))
  selectedIds.value = s
}
//Clear all selected users
function clearAll() {
  selectedIds.value = new Set()
}
//Remove one chip by id
function removeChip(id) {
  const s = new Set(selectedIds.value)
  s.delete(id)
  selectedIds.value = s
}
//Close dropdown when clicking outside.
function onDocClick(e) {
  const dropdown = document.getElementById('recipient-dropdown')
  const input = document.getElementById('recipient-input')
  if (!dropdown || !input) return
  if (!dropdown.contains(e.target) && !input.contains(e.target)) {
    closeDropdown()
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
//Selected users array for chips or review
const selectedUsers = computed(() => users.value.filter((u) => selectedIds.value.has(u.id)))

/*Email: subject, message, attachments.
  simple checks before sending.
  Cloud Functions - sendBulkEmail calls serverless backend. */
const subject = ref('')
const message = ref('')
const sending = ref(false)
const lastResult = ref(null)
//Attachments kept in memory as base64.
const attachments = ref([])
const MAX_TOTAL_BYTES = 10 * 1024 * 1024

// Turn plain text into safe HTML with <br>. Good for simple rich email.
function plainToHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}
//Helpers for base64 size calculation.
function base64Bytes(b64) {
  const len = (b64 || '').length
  return Math.floor((len * 3) / 4)
}
function currentAttachmentsBytes() {
  return attachments.value.reduce((sum, a) => sum + base64Bytes(a.content), 0)
}
//Convert a File to base64 payload object for email API.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result || ''
      const base64 = String(dataUrl).includes(',') ? String(dataUrl).split(',')[1] : String(dataUrl)
      resolve({
        filename: file.name,
        type: file.type || 'application/octet-stream',
        content: base64,
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* attachment — pick local files, convert to base64, enforce size limit.
   stop when total > 10MB and show a message. */
async function onPickLocalFiles(e) {
  const files = Array.from(e.target.files || [])
  let total = currentAttachmentsBytes()
  const add = []
  for (const f of files) {
    total += f.size
    if (total > MAX_TOTAL_BYTES) {
      alert('Total attachment size exceeds 10MB. Some files were not added.')
      break
    }
    add.push(await fileToBase64(f))
  }
  attachments.value = [...attachments.value, ...add]
  e.target.value = ''
}
//Remove one attachment by index.
function removeLocalAttachment(i) {
  attachments.value.splice(i, 1)
}
// Clear all attachments
function resetLocalAttachments() {
  attachments.value = []
}
//join names for a quick preview.
const attachmentNames = computed(() => attachments.value.map((a) => a.filename).join(', '))
/* send to many users at once.
   content and attachments are sent via backend*/
async function onSendBulk() {
  try {
    if (selectedIds.value.size === 0) {
      alert('Please select at least one recipient.')
      return
    }
    if (!subject.value.trim()) {
      alert('Please enter a subject.')
      return
    }
    if (!message.value.trim()) {
      alert('Please enter the message content.')
      return
    }

    sending.value = true

    const resp = await sendBulkEmail({
      userIds: Array.from(selectedIds.value),
      subject: subject.value,
      html: plainToHtml(message.value),
      attachments: attachments.value,
    })

    lastResult.value = resp
    alert(`Bulk sent   successes: ${resp.sent}   failures: ${resp.failed}`)
  } catch (e) {
    alert(`Send failure: ${e.message}`)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="container py-4">
    <!-- for admin to send emails to many users -->
    <h1 class="mb-3">Admin · Bulk Email</h1>

    <div class="card shadow-sm">
      <div class="card-body">
        <!-- Recipients area — show selected users and search list -->
        <div class="mb-3 position-relative">
          <div class="d-flex align-items-center justify-content-between mb-1">
            <label class="form-label m-0">Recipients (registered users)</label>
            <span class="badge bg-primary">{{ selectedIds.size }} selected</span>
          </div>

          <!-- Show chips for selected users -->
          <div v-if="selectedUsers.length" class="mb-2">
            <span
              v-for="u in selectedUsers"
              :key="u.id"
              class="badge rounded-pill text-bg-secondary me-2"
              title="Click × to remove"
            >
              {{ u.email }}
              <button
                class="btn-close btn-close-white ms-1"
                aria-label="Remove"
                type="button"
                @click="removeChip(u.id)"
              ></button>
            </span>
          </div>

          <!-- Search box — filter users by email or name -->
          <input
            id="recipient-input"
            :value="picker.filter"
            @focus="onFocusRecipients"
            @input="onInputRecipients"
            type="text"
            class="form-control"
            placeholder="Type to search by email or name"
            autocomplete="off"
          />

          <!-- Dropdown list — select or clear users -->
          <div v-show="picker.open" id="recipient-dropdown" class="dropdown-panel card shadow-sm">
            <div class="p-2 border-bottom d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                @click="selectAllVisible"
                :disabled="filteredUsers.length === 0"
              >
                Select all (visible)
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="clearAll"
                :disabled="selectedIds.size === 0"
              >
                Clear all
              </button>
              <span class="ms-auto text-muted small" v-if="loadingUsers">Loading…</span>
            </div>
            <!-- User list in dropdown with checkboxes -->
            <div class="list-container">
              <div
                v-for="u in filteredUsers"
                :key="u.id"
                class="form-check py-2 px-3 border-bottom small hoverable"
              >
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`u-${u.id}`"
                  :checked="selectedIds.has(u.id)"
                  @change="toggleOne(u.id)"
                />
                <label class="form-check-label ms-2" :for="`u-${u.id}`">
                  <span class="fw-semibold">{{ u.email }}</span>
                  <span v-if="u.name" class="text-muted"> · {{ u.name }}</span>
                </label>
              </div>

              <div v-if="!loadingUsers && filteredUsers.length === 0" class="text-muted small p-3">
                No users match your search.
              </div>
            </div>
          </div>
        </div>

        <!-- Email subject input -->
        <div class="mb-3">
          <label class="form-label">Subject</label>
          <input v-model="subject" class="form-control" placeholder="Monthly Update" />
        </div>

        <!-- (plain text only) -->
        <div class="mb-3">
          <label class="form-label">Message content</label>
          <textarea
            v-model="message"
            class="form-control"
            rows="8"
            placeholder="Enter your message here..."
          ></textarea>
          <div class="form-text">Plain text content will be sent in the email body.</div>
        </div>

        <!-- Attachments choose local files -->
        <div class="mb-3">
          <label class="form-label">Attachments (local • ≤10MB total)</label>

          <input
            id="fileInput"
            type="file"
            class="visually-hidden"
            multiple
            @change="onPickLocalFiles"
          />

          <!-- Custom file button and file list text  -->
          <div class="d-flex align-items-center gap-2">
            <label for="fileInput" class="btn btn-outline-secondary btn-sm">Choose files</label>
            <span class="text-muted small">
              {{ attachments.length ? attachmentNames : 'No files chosen' }}
            </span>
          </div>
          <!-- how selected attachments with remove buttons -->
          <div v-if="attachments.length" class="mt-2">
            <span
              v-for="(a, i) in attachments"
              :key="i"
              class="badge rounded-pill text-bg-secondary me-2"
            >
              {{ a.filename }}
              <button
                class="btn-close btn-close-white ms-1"
                aria-label="Remove"
                type="button"
                @click="removeLocalAttachment(i)"
              ></button>
            </span>
            <button class="btn btn-sm btn-outline-secondary ms-2" @click="resetLocalAttachments">
              Clear attachments
            </button>
          </div>
        </div>

        <!-- send to all selected users -->
        <div class="d-flex gap-2">
          <button class="btn btn-primary" :disabled="sending" @click="onSendBulk">
            {{ sending ? 'Sending…' : 'Send bulk email' }}
          </button>
        </div>
        <!-- Result area : show sent and failed counts -->
        <div v-if="lastResult" class="alert alert-light mt-3 mb-0">
          <div class="fw-bold">Last result</div>
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
/* make container width fit large screens but stay centered */
.container {
  max-width: 1000px;
}

/* dropdown and hover styles for recipient picker */
.position-relative {
  position: relative;
}
.dropdown-panel {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 0.25rem);
  border: 1px solid rgba(0, 0, 0, 0.075);
  border-radius: 0.5rem;
  overflow: hidden;
  background: #fff;
}
.list-container {
  max-height: 320px;
  overflow: auto;
}
.form-check {
  margin: 0;
}
.form-check-input {
  cursor: pointer;
}
.form-check-label {
  cursor: pointer;
  user-select: none;
}
.hoverable:hover {
  background: rgba(0, 0, 0, 0.03);
}

.badge {
  padding: 0.6rem 0.8rem;
  font-weight: 500;
}

.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
