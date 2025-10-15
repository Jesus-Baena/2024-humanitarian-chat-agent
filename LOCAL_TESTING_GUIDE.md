# Local Testing Guide - Tailwind CSS v4 Fix

**Server Status:** ✅ Running on http://localhost:3000  
**Mode:** Production Preview  
**Date:** October 16, 2025

## What's Running

The production build is now running locally with the Tailwind CSS v4 fixes applied. You can test it before deploying to production.

### Server Info
```
Node.js: v24.9.0
Nitro Preset: node-server
Port: 3000
Mode: Preview (production build)
```

## How to Test

### 1. Open in Browser
The Simple Browser should have opened automatically. If not:
- **Local:** http://localhost:3000
- **From other machine:** http://<your-ip>:3000

### 2. Test Responsive Design

#### Desktop Testing (Already works in dev)
- ✅ Full sidebar visible
- ✅ Chat window layout
- ✅ Message formatting
- ✅ Markdown rendering

#### Mobile/Responsive Testing (THIS is what we fixed)
**In your browser:**
1. Open Developer Tools (F12)
2. Click the device/responsive icon (or Ctrl+Shift+M)
3. Test these viewport sizes:
   - **iPhone SE:** 375px width
   - **iPad:** 768px width
   - **iPad Pro:** 1024px width
   - **Desktop:** 1920px width

**What to Check:**
- [ ] Sidebar collapses on mobile (< 768px)
- [ ] Hamburger menu appears
- [ ] Chat messages stack properly
- [ ] Buttons and inputs are properly sized
- [ ] Text is readable (not too small)
- [ ] No horizontal scrolling
- [ ] Colors and styling load correctly
- [ ] Tailwind utility classes working (flex, grid, responsive)

### 3. Check CSS is Loading

**In Browser DevTools:**
1. Open Network tab
2. Refresh page (Ctrl+R)
3. Filter by "CSS"
4. Look for: `entry-[hash].css`
5. Click on it and verify:
   - ✅ File size > 0 (should be 100-300KB)
   - ✅ Status: 200 OK
   - ✅ Contains Tailwind utilities (look for `.flex`, `.grid`, etc.)

### 4. Inspect Element Styling

**Right-click any element → Inspect:**
1. Look at Computed styles
2. Verify Tailwind classes are applied:
   - `flex`, `flex-col`, `h-full`
   - Responsive classes: `sm:p-0`, `md:block`, etc.
   - Color utilities: `bg-primary-500`, `text-gray-900`

### 5. Compare Dev vs Production

**Side-by-side comparison:**
- **Dev:** `pnpm dev` → http://localhost:3000
- **Production:** `pnpm preview` → http://localhost:3000 (current)

They should look **identical** now. If production looks broken or different:
- CSS not loading → Check Network tab
- Styles missing → Check browser console for errors
- Layout broken → Tailwind config issue

## Common Issues to Look For

### ❌ Problem Signs
- White/unstyled page
- Buttons have no styling
- Layout doesn't respond to screen size
- Console errors about CSS
- Missing fonts or colors

### ✅ Good Signs
- Page styled with blue/neutral color scheme
- Sidebar with Logo
- "New chat" button properly styled
- Messages in colored bubbles
- Responsive layout adjusts to screen size

## Browser Testing

Test in multiple browsers if possible:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge

## Mobile Device Testing

If you have a phone/tablet on the same network:
1. Find your machine's IP: `ip addr` or `ifconfig`
2. On mobile browser: `http://<your-ip>:3000`
3. Test touch interactions
4. Verify responsive design

## When You're Ready to Deploy

Once everything looks good:

### 1. Stop the preview server
```bash
# Press Ctrl+C in the terminal running pnpm preview
```

### 2. Commit changes
```bash
git add .
git commit -m "fix: Configure Tailwind CSS v4 for production builds"
git push
```

### 3. Build Docker image
```bash
docker build -t ghcr.io/jesus-baena/chat-humanitarian-agent:latest .
docker push ghcr.io/jesus-baena/chat-humanitarian-agent:latest
```

### 4. Deploy to Swarm
```bash
# SSH to swarm manager or run deploy script
docker stack deploy -c docker-compose.yml web
```

## Files Changed

Summary of what was fixed:
- ✅ `package.json` - Moved tailwindcss to dependencies
- ✅ `app/assets/css/main.css` - Added @theme directive
- ❌ `tailwind.config.ts` - Removed (v4 doesn't need it)
- ❌ `postcss.config.mjs` - Removed (handled by @nuxt/ui)
- ✅ `@tailwindcss/postcss` - Added as devDependency

## Stopping the Server

When you're done testing:
```bash
# Press Ctrl+C in the terminal
# Or:
pkill -f "node.*index.mjs"
```

## Need Help?

If something doesn't look right:
1. Check browser console for errors (F12 → Console)
2. Check Network tab for failed CSS loads
3. Compare with dev mode (`pnpm dev`)
4. Review `TAILWIND_V4_FIX.md` for technical details

---

**Current Status:** Preview server running ✅  
**Next Step:** Test responsive design in browser  
**After Testing:** Deploy to production or request fixes
