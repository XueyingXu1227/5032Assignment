import { ref, onMounted, onUnmounted } from 'vue'

export function useOnline() {
  const isOnline = ref(navigator.onLine)
  const set = () => {
    isOnline.value = navigator.onLine
  }
  onMounted(() => {
    window.addEventListener('online', set)
    window.addEventListener('offline', set)
  })
  onUnmounted(() => {
    window.removeEventListener('online', set)
    window.removeEventListener('offline', set)
  })
  return { isOnline }
}
