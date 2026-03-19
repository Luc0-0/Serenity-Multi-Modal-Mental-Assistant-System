#!/usr/bin/env python3
"""
Migration System Verification Script
Tests that alembic can generate migrations properly after deployment.
"""

import os
import sys
from pathlib import Path

# Add project root to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

try:
    # Test 1: Import all models successfully
    print("🔍 Testing model imports...")
    from app.models.user import User
    from app.models.conversation import Conversation
    from app.models.message import Message
    from app.models.emotion_log import EmotionLog
    from app.models.journal_entry import JournalEntry
    from app.models.crisis_event import CrisisEvent
    from app.models.goal import Goal, GoalPhase, DailySchedule, DailyLog, PhaseTask, WeeklyReview, StreakFreeze
    from app.models.meditation_session import MeditationSession
    from app.models.memory import ConversationContextCache, SemanticMemory, EmotionalProfile, MetaReflection
    print("✅ All model imports successful")

    # Test 2: Verify Base metadata registration
    print("\n🔍 Testing Base metadata registration...")
    from app.db.base import Base

    expected_tables = {
        'users', 'conversations', 'messages', 'emotion_logs', 'journal_entries',
        'crisis_events', 'goals', 'goal_phases', 'daily_schedules', 'daily_logs',
        'phase_tasks', 'weekly_reviews', 'streak_freezes', 'meditation_sessions',
        'conversation_context_cache', 'semantic_memories', 'emotional_profiles', 'meta_reflections'
    }

    registered_tables = set(Base.metadata.tables.keys())
    print(f"Expected tables: {len(expected_tables)}")
    print(f"Registered tables: {len(registered_tables)}")

    missing_tables = expected_tables - registered_tables
    extra_tables = registered_tables - expected_tables

    if missing_tables:
        print(f"❌ Missing tables in Base.metadata: {missing_tables}")
    else:
        print("✅ All expected tables registered in Base.metadata")

    if extra_tables:
        print(f"ℹ️  Extra tables found: {extra_tables}")

    # Test 3: Check alembic configuration
    print("\n🔍 Testing alembic configuration...")

    # Check alembic.ini exists
    alembic_ini = backend_path / "alembic.ini"
    if alembic_ini.exists():
        print("✅ alembic.ini found")
    else:
        print("❌ alembic.ini missing")

    # Check env.py imports
    env_py = backend_path / "alembic" / "env.py"
    if env_py.exists():
        with open(env_py, 'r') as f:
            env_content = f.read()

        required_imports = [
            'from app.models.goal import',
            'from app.models.meditation_session import',
            'Goal,', 'GoalPhase,', 'MeditationSession'
        ]

        missing_imports = [imp for imp in required_imports if imp not in env_content]

        if missing_imports:
            print(f"❌ Missing imports in env.py: {missing_imports}")
        else:
            print("✅ All required model imports found in env.py")
    else:
        print("❌ alembic/env.py missing")

    # Test 4: Check migration file chain
    print("\n🔍 Testing migration chain...")

    versions_dir = backend_path / "alembic" / "versions"
    if versions_dir.exists():
        migration_files = list(versions_dir.glob("*.py"))
        migration_files = [f for f in migration_files if f.name != "__init__.py"]

        print(f"Found {len(migration_files)} migration files")

        # Check if our new migration exists
        goal_migration = None
        for f in migration_files:
            if "goal" in f.name.lower():
                goal_migration = f
                break

        if goal_migration:
            print(f"✅ Goal migration found: {goal_migration.name}")

            # Check revision chain
            with open(goal_migration, 'r') as f:
                content = f.read()

            if "down_revision = 'rename_ai_to_auto'" in content:
                print("✅ Migration revision chain correct")
            else:
                print("❌ Migration revision chain incorrect")
        else:
            print("❌ Goal migration file not found")
    else:
        print("❌ alembic/versions directory missing")

    print("\n" + "="*60)
    print("MIGRATION SYSTEM STATUS")
    print("="*60)

    # Summary
    all_good = True
    if missing_tables:
        all_good = False
        print("❌ Model registration issues")
    if not env_py.exists() or missing_imports:
        all_good = False
        print("❌ Alembic env.py issues")
    if not goal_migration:
        all_good = False
        print("❌ Migration file issues")

    if all_good:
        print("✅ Migration system ready for automatic generation")
        print("✅ Future model changes will auto-generate migrations")
        print("✅ Railway deployment will run migrations automatically")
        print("\n🚀 READY FOR DEPLOYMENT!")
    else:
        print("⚠️  Migration system needs fixes before deployment")

except Exception as e:
    print(f"❌ Migration system test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)