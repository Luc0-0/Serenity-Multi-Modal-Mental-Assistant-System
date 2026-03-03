import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "serenity.db"

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# Get all users
cur.execute("SELECT id, email, name FROM users")
users = cur.fetchall()

print("Current users in database:")
for user_id, email, name in users:
    print(f"  ID: {user_id}, Email: {email}, Name: {name}")

print("\nDeleting all user data...")

# Delete all data
cur.execute("DELETE FROM emotion_logs")
cur.execute("DELETE FROM journal_entries")
cur.execute("DELETE FROM messages")
cur.execute("DELETE FROM conversations")
cur.execute("DELETE FROM users")

conn.commit()
conn.close()

print("✔ All user data deleted from database")
