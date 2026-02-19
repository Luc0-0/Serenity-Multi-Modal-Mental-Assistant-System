import sqlite3

conn = sqlite3.connect('serenity.db')
cursor = conn.cursor()

# Get alembic_version table structure and contents
try:
    cursor.execute("PRAGMA table_info(alembic_version)")
    columns = cursor.fetchall()
    print("alembic_version table structure:")
    for col in columns:
        print(f"  {col}")
    
    cursor.execute("SELECT * FROM alembic_version")
    versions = cursor.fetchall()
    print(f"\nalembic_version contents ({len(versions)} rows):")
    for v in versions:
        print(f"  {v}")
except Exception as e:
    print(f"Error checking alembic_version: {e}")

# Check users table structure
print("\n\nusers table structure:")
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col}")

# Check journal_entries table structure
print("\n\njournal_entries table structure:")
cursor.execute("PRAGMA table_info(journal_entries)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col}")

conn.close()
