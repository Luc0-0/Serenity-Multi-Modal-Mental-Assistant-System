# Supabase Setup Guide for Serenity

## Step 1: Supabase Dashboard Setup

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select Your Project**: Find your Serenity project or create new one
3. **Get Connection Details**:
   - Go to **Settings** → **Database**
   - Copy the **Connection String** (URI format)
   - Note: Use "Direct connection" not "Connection pooling" for migrations

## Step 2: Database Schema Setup

### Option A: Use Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in left sidebar
2. Create new query and run the schema creation script below

### Option B: Use Table Editor

1. Go to **Table Editor** in left sidebar
2. Create tables manually using the UI

## Step 3: Environment Configuration

Update your environment variables:

```bash
# Replace with your actual Supabase connection string
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres

# Add these for Supabase integration
SUPABASE_URL=https://[YOUR-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-KEY]
```

## Step 4: Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    theme VARCHAR(50) DEFAULT 'balanced',
    duration_days INTEGER DEFAULT 180,
    start_date DATE NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    freezes_available INTEGER DEFAULT 0,
    total_completed_days INTEGER DEFAULT 0,
    answers_json TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal Phases table
CREATE TABLE IF NOT EXISTS goal_phases (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    unlock_streak_required INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily Schedules table
CREATE TABLE IF NOT EXISTS daily_schedules (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    time VARCHAR(10) NOT NULL,
    activity VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily Logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed_items TEXT,
    is_frozen BOOLEAN DEFAULT false,
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Phase Tasks table
CREATE TABLE IF NOT EXISTS phase_tasks (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER NOT NULL REFERENCES goal_phases(id) ON DELETE CASCADE,
    domain_name VARCHAR(100) NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    subtasks TEXT,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Weekly Reviews table
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    answers TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Streak Freezes table
CREATE TABLE IF NOT EXISTS streak_freezes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    used_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Meditation Sessions table
CREATE TABLE IF NOT EXISTS meditation_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    mood_before VARCHAR(50),
    mood_after VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_phases_goal_id ON goal_phases(goal_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedules_goal_id ON daily_schedules(goal_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_goal_id ON daily_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_phase_tasks_phase_id ON phase_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_goal_id ON weekly_reviews(goal_id);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user_id ON streak_freezes(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_goal_id ON streak_freezes(goal_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON meditation_sessions(user_id);
```

## Step 5: Verify Setup

1. **Check Tables**: Go to Table Editor and verify all tables are created
2. **Test Connection**: Use the connection string in your backend
3. **Run Test Queries**: Try inserting sample data

## Step 6: Migration Strategy with Supabase

Supabase has built-in migration support:

1. **Database Migrations**: Use Supabase CLI or SQL Editor
2. **Schema Changes**: Version control through Supabase Dashboard
3. **Backup**: Automatic backups in Supabase

## Next Steps

1. Update your `.env` file with Supabase credentials
2. Test API endpoints with new database
3. Deploy with new configuration
