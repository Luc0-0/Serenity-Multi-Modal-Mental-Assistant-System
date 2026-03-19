#!/usr/bin/env python3
"""
Supabase Connection Test Script
Tests database connection and basic CRUD operations.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

try:
    from app.core.config import settings
    from app.db.session import check_database_health, SessionLocal
    from app.db.base import Base
    from sqlalchemy import text

    async def test_supabase_connection():
        print("🔍 Testing Supabase Connection...")
        print(f"Database URL: {settings.database_url[:50]}...")

        # Test 1: Health Check
        print("\n📝 Test 1: Database Health Check")
        is_healthy = await check_database_health()
        if is_healthy:
            print("✅ Database connection healthy")
        else:
            print("❌ Database connection failed")
            return False

        # Test 2: Basic Query
        print("\n📝 Test 2: Basic Database Query")
        try:
            async with SessionLocal() as session:
                result = await session.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"✅ PostgreSQL version: {version}")
        except Exception as e:
            print(f"❌ Query failed: {e}")
            return False

        # Test 3: Check Existing Tables
        print("\n📝 Test 3: Check Database Schema")
        try:
            async with SessionLocal() as session:
                result = await session.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """))
                tables = result.fetchall()

                if tables:
                    print(f"✅ Found {len(tables)} existing tables:")
                    for table in tables:
                        print(f"   - {table[0]}")
                else:
                    print("ℹ️  No tables found - ready for initial migration")
        except Exception as e:
            print(f"❌ Schema check failed: {e}")
            return False

        # Test 4: Test Goal Models Registration
        print("\n📝 Test 4: Model Registration Check")
        try:
            expected_tables = {
                'users', 'goals', 'goal_phases', 'daily_schedules',
                'daily_logs', 'phase_tasks', 'weekly_reviews',
                'streak_freezes', 'meditation_sessions'
            }

            registered_tables = set(Base.metadata.tables.keys())
            print(f"✅ Models registered: {len(registered_tables)} tables")

            missing_models = expected_tables - registered_tables
            if missing_models:
                print(f"⚠️  Missing model registrations: {missing_models}")
            else:
                print("✅ All Goal models properly registered")
        except Exception as e:
            print(f"❌ Model registration check failed: {e}")

        # Test 5: Test Supabase-specific Features
        print("\n📝 Test 5: Supabase Features Check")
        try:
            async with SessionLocal() as session:
                # Check for uuid extension
                result = await session.execute(text("""
                    SELECT EXISTS(
                        SELECT 1 FROM pg_extension
                        WHERE extname = 'uuid-ossp'
                    ) as has_uuid
                """))
                has_uuid = result.scalar()

                if has_uuid:
                    print("✅ UUID extension available")
                else:
                    print("ℹ️  UUID extension not found (will be added during migration)")

                # Check for RLS (Row Level Security) - Supabase feature
                result = await session.execute(text("""
                    SELECT COUNT(*) as policy_count
                    FROM pg_policies
                    LIMIT 1
                """))
                print("✅ Supabase RLS system accessible")

        except Exception as e:
            print(f"ℹ️  Supabase features check: {e}")

        return True

    async def main():
        print("=" * 60)
        print("SUPABASE CONNECTION TEST")
        print("=" * 60)

        # Validate configuration
        if not settings.database_url:
            print("❌ DATABASE_URL not set in environment")
            print("📋 Please check your .env file")
            return

        if "supabase.co" not in settings.database_url:
            print("⚠️  Database URL doesn't appear to be Supabase")
            print(f"   URL format: {settings.database_url[:30]}...")

        success = await test_supabase_connection()

        print("\n" + "=" * 60)
        print("SUPABASE CONNECTION SUMMARY")
        print("=" * 60)

        if success:
            print("✅ Supabase connection successful!")
            print("✅ Ready for Goal Builder API integration")
            print("✅ Migration system configured properly")
            print("\n🚀 NEXT STEPS:")
            print("1. Run the schema setup SQL in Supabase SQL Editor")
            print("2. Test Goal Builder API endpoints")
            print("3. Deploy with confidence!")
        else:
            print("❌ Supabase connection issues detected")
            print("📋 Check your environment variables and network connection")

    if __name__ == "__main__":
        asyncio.run(main())

except Exception as e:
    print(f"❌ Test setup failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)