import sqlite3

conn = sqlite3.connect('serenity.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

# Check alembic_version
try:
    cursor.execute("SELECT version_num FROM alembic_version")
    versions = cursor.fetchall()
    print("\nAlembic versions applied:")
    for v in versions:
        print(f"  - {v[0]}")
except Exception as e:
    print(f"\nNo alembic_version table: {e}")

conn.close()
