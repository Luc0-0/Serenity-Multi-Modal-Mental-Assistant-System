# Railway Deployment Configuration

Your frontend is deployed at: `serenity-frontend-production-a34e.up.railway.app`

## Step 1: Find Your Backend Service URL

On Railway Dashboard:
1. Go to your Serenity project
2. Look for the Backend service
3. It should have a public URL like: `https://serenity-backend-xxxxx.up.railway.app` or similar
4. Copy this URL

## Step 2: Configure Frontend Environment Variables

In Railway Dashboard, for the **FRONTEND** service, set:

```
VITE_API_URL=https://[YOUR-BACKEND-URL]/api
```

Replace `[YOUR-BACKEND-URL]` with your actual backend service URL from Step 1.

**Example**: If your backend is at `https://serenity-backend-a1b2c3.up.railway.app`, set:
```
VITE_API_URL=https://serenity-backend-a1b2c3.up.railway.app/api
```

## Step 3: Ensure CORS is Configured

Make sure the backend's `CORS_ORIGINS` environment variable includes your frontend domain.

In Railway Dashboard, for the **BACKEND** service, check or set:

```
CORS_ORIGINS=["https://serenity-frontend-production-a34e.up.railway.app"]
```

Add your actual frontend URL to the list (including `https://`).

## Step 4: Deploy

Push your changes:
```bash
git add .
git commit -m "Fix: Correct API URL configuration for production"
git push
```

Railway will automatically redeploy the frontend service.

## Step 5: Test

1. Open your frontend application
2. Go to Insights/Journal pages
3. Check browser console (F12 > Console tab)
4. Look for the message: `[API Client] Configured with base URL: https://[your-backend]/api`
5. Verify no 404 errors appear

## If Journal Still Shows 404

1. Check the actual request URL in Network tab (F12 > Network)
2. Verify it's calling the correct backend URL
3. Check backend is receiving the request (check backend logs)
4. Verify CORS headers are correct in the response

## Local Testing

For local development with docker-compose:

```bash
docker-compose up -d
```

This will use the correctly configured `VITE_API_URL=http://serenity-backend:8000/api`

## Environment Variables Summary

### Frontend Service (Railway)
```
VITE_API_URL=https://[YOUR-BACKEND-URL]/api
VITE_BACKEND_URL=https://[YOUR-BACKEND-URL]    # (optional fallback)
```

### Backend Service (Railway)  
```
DATABASE_URL=postgresql://...
CORS_ORIGINS=["https://serenity-frontend-production-a34e.up.railway.app"]
SECRET_KEY=...
LLM_PROVIDER=ollama  # or your provider
OLLAMA_ENDPOINT=...
```

### Frontend Service (Local Docker)
```
VITE_API_URL=http://serenity-backend:8000/api
BACKEND_URL=http://serenity-backend:8000
```

## Troubleshooting

### 404 on Journal Endpoints
- [ ] Check `VITE_API_URL` is set correctly
- [ ] Verify backend URL is accessible from your network
- [ ] Check backend CORS settings
- [ ] Check backend service is running

### CORS Errors
- [ ] Frontend domain must be in backend's `CORS_ORIGINS`
- [ ] Use exact domain (including https://)
- [ ] Restart backend service after changing CORS

### API Response Issues
- [ ] Check backend logs in Railway
- [ ] Verify database connection
- [ ] Check authentication token is being sent

## Quick Debug Commands

```bash
# Check if backend is accessible
curl -I https://[YOUR-BACKEND-URL]/health

# Check CORS headers
curl -H "Origin: https://serenity-frontend-production-a34e.up.railway.app" \
     https://[YOUR-BACKEND-URL]/api/journal/entries/
```
