# Vercel Deployment Fix for Admin Dashboard - Progress Tracker

## Steps (Approved Plan):
- [x] 1. Create root `vercel.json` with SPA rewrites and build settings for admin-dashboard
- [x] 2. Update `sensesafe/src/apps/admin-dashboard/vite.config.js` to set `base: '/'` explicitly and fix build outDir to 'dist'
- [ ] 3. Run these commands to build and test locally:\n  ```bash\n  cd sensesafe/src/apps/admin-dashboard\n  npm ci\n  npm run build\n  # Verify: ls -la dist/ should show index.html etc.\n  # Test preview: npm run preview\n  ```
- [ ] 4. User deploys via Vercel dashboard/CLI (set Root Directory: sensesafe/src/apps/admin-dashboard)
- [ ] 5. Test deployment URL and client-side routes (e.g., /alerts)
- [ ] 6. Update API proxy baseURL in `src/services/api.js` for production if needed (post-deploy)

Current step: Starting with 1 & 2.

