<script setup lang="ts">
// UI Pro components are auto-imported by Nuxt, no need for manual imports
import DashboardNavbar from '~/components/DashboardNavbar.vue'
// Home page UI only (no backend integration)
</script>

<template>
  <UDashboardPanel id="home" class="[&>div]:p-0 [&>div]:sm:p-0">
    <template #header>
      <DashboardNavbar />
    </template>
    <template #body>
      <!-- Help prompt UI extracted to a component -->
      <HelpPrompt />
    </template>
  </UDashboardPanel>
</template>
