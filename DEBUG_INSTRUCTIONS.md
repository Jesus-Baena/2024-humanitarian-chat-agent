# Debug Instructions for Chat App

## Steps to Debug

1. **Open browser to** `http://localhost:3000`

2. **Open DevTools Console** (F12 or Cmd+Option+I)

3. **Create or open a chat**

4. **Send a test message** like "Hello"

5. **Check console output** - You should see logs like:
   ```
   [useChat] sendMessage called with: Hello
   [useChat] Adding user message: {...}
   [useChat] Persisting user message...
   [useChat] Persist result: ...
   [useChat] Starting stream completion...
   [useAssistants] getCompletion called
   [useAssistants] flowiseUrl: https://flowise...
   [useAssistants] flowiseApiKey: ***SET***
   [useAssistants] Fetching from: ...
   [useAssistants] Response status: ...
   ```

## What to Look For

### If you see NO logs at all:
- The sendMessage function is not being called
- Issue is in ChatInput or ChatWindow event binding

### If logs stop at "Persisting user message":
- The persist API call is failing
- Check Network tab for failed `/api/chats/[id]/messages` request

### If logs stop at "Starting stream completion":
- getCompletion is throwing an error
- Check for error messages in console

### If you see "No flowiseUrl configured":
- Runtime config is not loading the FLOWISE_URL
- Check nuxt.config.ts

### If you see "Response status: 401" or "403":
- API key is wrong or not being sent
- Flowise authentication issue

### If you see "Response status: 404":
- Flowise URL is wrong
- Prediction ID might be invalid

### If you see "Response status: 200" but no message appears:
- Streaming/parsing issue
- Check the handleStreamCompletion logic

## Quick Fixes

### Restart dev server:
```bash
# Stop the dev server (Ctrl+C in its terminal)
pnpm dev
```

### Test Flowise directly:
```bash
curl -X POST https://flowise.baena.site/api/v1/prediction/40718af9-e9bd-47d9-a57b-009cb26f8fe3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FLOWISE_API_KEY" \
  -d '{"question": "Hello", "streaming": false}'
```

## Report Back

Please share:
1. **Console logs** (copy/paste or screenshot)
2. **Network tab** - any failed requests?
3. **What happens** when you click Send?
