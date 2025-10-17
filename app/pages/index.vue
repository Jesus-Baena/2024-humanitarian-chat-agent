<script setup lang="ts">
import DashboardNavbar from '~/components/DashboardNavbar.vue'
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
