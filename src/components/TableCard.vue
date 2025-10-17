<template>
  <!-- BR (F.1)：Dashboard layout — used for showing charts or tables inside a card -->
  <!-- Shows the card title and optional action buttons (like export or filter) -->
  <div class="card shadow-sm mb-3">
    <div class="card-body">
      <!-- BR (A.2)：Responsive layout — title and actions stay aligned on all screens -->
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h6 class="text-muted m-0">{{ title }}</h6>
        <!-- Custom slot for buttons or dropdowns -->
        <slot name="actions"></slot>
      </div>

      <!-- BR (D.3)：Interactive Table — table or chart can be placed here -->
      <div class="table-responsive">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props: title shown at top of each dashboard card
defineProps({ title: { type: String, required: true } })
</script>

<style scoped>
/* Rounded card corners for better look */
.card {
  border-radius: 14px;
}
</style>
