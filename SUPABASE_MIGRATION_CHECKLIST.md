# Supabase Migration Instructions

## Quick Setup Checklist

✅ **Step 1: Get Supabase Credentials**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → Database
4. Copy "Connection string" (Direct connection)
5. Go to Settings → API
6. Copy Project URL, anon key, and service_role key

✅ **Step 2: Update Environment Variables**

```bash
# Copy .env.supabase.template to .env and fill in:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

✅ **Step 3: Run Database Schema**

1. Open Supabase SQL Editor
2. Copy/paste the schema from SUPABASE_SETUP_GUIDE.md
3. Execute the SQL script

✅ **Step 4: Test Connection**

```bash
cd backend
python test_supabase_connection.py
```

✅ **Step 5: Deploy**

- Update Railway/Vercel environment variables
- Deploy backend with new configuration
- Goal Builder should now work!

## Key Changes Made

**Backend Configuration:**

- ✅ Updated `app/core/config.py` - Added Supabase settings
- ✅ Updated `app/db/session.py` - Improved connection handling
- ✅ Updated `alembic/env.py` - Use shared sync engine
- ✅ Created test script for connection validation

**Files Created:**

- `SUPABASE_SETUP_GUIDE.md` - Complete setup instructions
- `.env.supabase.template` - Environment template
- `test_supabase_connection.py` - Connection validation
- `SUPABASE_MIGRATION_CHECKLIST.md` - This quick checklist

## Why Supabase?

- ✅ **Visual Interface** - See all tables, data, queries in dashboard
- ✅ **Real-time** - Built-in subscriptions for live updates
- ✅ **Automatic Backups** - Point-in-time recovery
- ✅ **Row Level Security** - Advanced security policies
- ✅ **Auto API** - RESTful API generated automatically
- ✅ **Migration Management** - Version controlled schema changes

## Verification Commands

```bash
# Test connection
python backend/test_supabase_connection.py

# Check migration system
cd backend && alembic current

# Test API endpoint (after deployment)
curl https://your-api.railway.app/api/v1/goals/health
```
