<!-- DEBUG: Test page to verify Flowise configuration -->
<template>
  <div class="p-8 space-y-4">
    <h1 class="text-2xl font-bold">Flowise Configuration Test</h1>
    
    <div class="space-y-2">
      <div>
        <strong>Flowise URL:</strong>
        <pre class="bg-gray-100 p-2 rounded">{{ flowiseUrl || 'NOT SET' }}</pre>
      </div>
      
      <div>
        <strong>Flowise API Key:</strong>
        <p class="text-sm text-gray-500">Kept private on the server and not exposed client-side.</p>
      </div>
    </div>

    <div class="space-y-2">
      <UButton @click="testConnection">Test Flowise Connection</UButton>
      
      <div v-if="testResult" class="p-4 rounded" :class="testSuccess ? 'bg-green-100' : 'bg-red-100'">
        <pre>{{ testResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const runtimeConfig = useRuntimeConfig()
  const flowiseUrl = runtimeConfig.public?.flowiseUrl || 'NOT SET'

const testResult = ref('')
const testSuccess = ref(false)

async function testConnection() {
  testResult.value = 'Testing...'
  testSuccess.value = false
  
  try {
    if (!flowiseUrl || flowiseUrl === 'NOT SET') {
      testResult.value = 'ERROR: Flowise URL is not configured'
      return
    }
    const response = await fetch('/api/flowise.proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        question: 'Hello, this is a test', 
        streaming: false 
      })
    })
    
    testSuccess.value = response.ok
    
    if (response.ok) {
      const data = await response.text()
      testResult.value = `SUCCESS (${response.status})\n\nResponse preview:\n${data.substring(0, 500)}`
    } else {
      const errorText = await response.text()
      testResult.value = `FAILED (${response.status})\n\nError:\n${errorText}`
    }
  } catch (error: unknown) {
    const err = error as Error
    testResult.value = `EXCEPTION:\n${err.message}\n\nStack:\n${err.stack || 'No stack trace'}`
  }
}
</script>
