import sqlite3

conn = sqlite3.connect('serenity.db')
cursor = conn.cursor()

print("Current users table structure:")
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]}: {col[2]}")

print("\nCurrent journal_entries table structure:")
cursor.execute("PRAGMA table_info(journal_entries)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]}: {col[2]}")

print("\nCurrent alembic_version:")
cursor.execute("SELECT * FROM alembic_version")
versions = cursor.fetchall()
for v in versions:
    print(f"  {v}")

conn.close()
