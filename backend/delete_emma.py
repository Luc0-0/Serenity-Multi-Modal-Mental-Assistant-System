import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "serenity.db"

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# Find Emma Wilson's user ID
cur.execute("SELECT id FROM users WHERE email = ?", ("emma.wilson@serenity.app",))
result = cur.fetchone()

if result:
    user_id = result[0]
    print(f"Found Emma Wilson (ID: {user_id})")
    
    # Delete all related data
    cur.execute("DELETE FROM emotion_logs WHERE user_id = ?", (user_id,))
    print(f"  Deleted emotion_logs")
    
    cur.execute("DELETE FROM journal_entries WHERE user_id = ?", (user_id,))
    print(f"  Deleted journal_entries")
    
    cur.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)", (user_id,))
    print(f"  Deleted messages")
    
    cur.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
    print(f"  Deleted conversations")
    
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
    print(f"  Deleted user")
    
    conn.commit()
    print("\n✔ Emma Wilson completely removed from database")
else:
    print("Emma Wilson not found in database")

conn.close()
