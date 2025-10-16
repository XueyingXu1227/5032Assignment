<template>
  <div class="card shadow-sm mb-3">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h6 class="text-muted m-0">{{ title }}</h6>
        <slot name="actions"></slot>
      </div>
      <div class="table-responsive">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, required: true } })
</script>

<style scoped>
.card {
  border-radius: 14px;
}
</style>
