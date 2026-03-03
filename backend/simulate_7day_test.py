"""
Serenity 7-Day User Journey Simulation
=======================================
Sends 21 messages (3 per day × 7 days) through the live backend API so that
every service runs end-to-end (Ollama, emotion detection, journal extraction,
crisis detection, analytics).  Then backdates DB timestamps to spread the
entries across the past 7 calendar days for realistic Insights dashboard
visualisation.

Usage:
    python simulate_7day_test.py                # full run
    python simulate_7day_test.py --skip-backdate  # skip DB timestamp update
"""

import argparse
import asyncio
import sqlite3
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL = "http://localhost:8000"
DB_PATH = Path(__file__).resolve().parent / "serenity.db"

TEST_USER = {
    "name": "Emma Wilson",
    "email": "emma.wilson@serenity.app",
    "password": "Serenity2024!",
}

# Each day: (label, weekday, [msg1, msg2, msg3])
DAILY_MESSAGES: list[tuple[str, str, list[str]]] = [
    ("Day 1", "Mon", [
        "I've been really overwhelmed with deadlines",
        "My boss keeps adding more tasks",
        "I can barely sleep thinking about it",
    ]),
    ("Day 2", "Tue", [
        "I feel like I'm failing at everything",
        "Nobody seems to understand what I'm going through",
        "I just feel so alone",
    ]),
    ("Day 3", "Wed", [
        "A friend reached out today and it helped",
        "Maybe things aren't as bad as I thought",
        "I went for a short walk and felt slightly better",
    ]),
    ("Day 4", "Thu", [
        "I actually got something done today and felt proud",
        "My team acknowledged my hard work",
        "I feel a bit of hope again",
    ]),
    ("Day 5", "Fri", [
        "The weekend is coming but I'm still stressed",
        "I keep going back and forth between ok and not ok",
        "I don't know what to feel",
    ]),
    ("Day 6", "Sat", [
        "Taking some time to breathe today",
        "Looking back this week was a rollercoaster",
        "I'm trying to be kinder to myself",
    ]),
    ("Day 7", "Sun", [
        "I'm grateful for the people who care about me",
        "I think I'm learning to handle things better",
        "Tomorrow is a new start",
    ]),
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def banner(text: str) -> None:
    width = 60
    print(f"\n{'=' * width}")
    print(f"  {text}")
    print(f"{'=' * width}")


def section(text: str) -> None:
    print(f"\n--- {text} ---")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

async def signup_or_login(client: httpx.AsyncClient) -> tuple[int, str]:
    """Try signup first; if the user already exists, fall back to login.
    Returns (user_id, access_token).
    """
    section("Creating / logging in test user")

    # Try signup
    resp = await client.post(
        f"{BASE_URL}/api/auth/signup/",
        json={
            "name": TEST_USER["name"],
            "email": TEST_USER["email"],
            "password": TEST_USER["password"],
        },
    )
    if resp.status_code == 201:
        data = resp.json()
        user_id = data["user"]["id"]
        token = data["access_token"]
        print(f"  ✔ Signed up new user: id={user_id}, email={TEST_USER['email']}")
        return user_id, token

    # Signup failed (likely 400 = already exists) – try login
    resp = await client.post(
        f"{BASE_URL}/api/auth/login/",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"],
        },
    )
    if resp.status_code == 200:
        data = resp.json()
        user_id = data["user"]["id"]
        token = data["access_token"]
        print(f"  ✔ Logged in existing user: id={user_id}, email={TEST_USER['email']}")
        return user_id, token

    print(f"  ✗ Auth failed: {resp.status_code} – {resp.text}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Chat simulation
# ---------------------------------------------------------------------------

async def send_message(
    client: httpx.AsyncClient,
    user_id: int,
    message: str,
    conversation_id: int | None,
) -> dict | None:
    """Send a single chat message and return the parsed response (or None)."""
    payload: dict = {"user_id": user_id, "message": message}
    if conversation_id is not None:
        payload["conversation_id"] = conversation_id

    try:
        resp = await client.post(
            f"{BASE_URL}/api/chat/",
            json=payload,
            timeout=120.0,
        )
        if resp.status_code == 200:
            return resp.json()
        print(f"    ✗ HTTP {resp.status_code}: {resp.text[:200]}")
    except httpx.TimeoutException:
        print("    ✗ Request timed out (120s)")
    except Exception as exc:
        print(f"    ✗ Error: {exc}")
    return None


async def run_simulation(client: httpx.AsyncClient, user_id: int) -> dict:
    """Send all 21 messages and return summary stats."""
    stats = {
        "total_sent": 0,
        "total_success": 0,
        "total_failed": 0,
        "conversations": set(),
        "emotions_detected": [],
        "crisis_flags": 0,
        "message_ids": [],
        "conversation_ids": [],
    }

    for day_idx, (day_label, weekday, messages) in enumerate(DAILY_MESSAGES):
        banner(f"{day_label} ({weekday}) – {len(messages)} messages")
        conversation_id: int | None = None  # new conversation per day

        for msg_idx, message in enumerate(messages, start=1):
            print(f"  [{msg_idx}/3] \"{message[:60]}...\"" if len(message) > 60 else f"  [{msg_idx}/3] \"{message}\"")
            stats["total_sent"] += 1

            result = await send_message(client, user_id, message, conversation_id)

            if result is None:
                stats["total_failed"] += 1
                print("         → FAILED")
                continue

            stats["total_success"] += 1
            conv_id = result.get("conversation_id")
            conversation_id = conv_id  # reuse for rest of day
            stats["conversations"].add(conv_id)
            stats["conversation_ids"].append(conv_id)
            stats["message_ids"].append(result.get("message_id"))

            reply_preview = (result.get("reply") or "")[:100]
            print(f"         → conv={conv_id} | reply: {reply_preview}...")

            if result.get("crisis_detected"):
                stats["crisis_flags"] += 1
                print(f"         ⚠ CRISIS detected (severity: {result.get('crisis_severity')})")

            # Small delay between messages to avoid hammering the API
            await asyncio.sleep(1.0)

    return stats


# ---------------------------------------------------------------------------
# DB backdating
# ---------------------------------------------------------------------------

def backdate_timestamps(user_id: int) -> None:
    """Spread emotion_logs, messages, journal_entries, and conversations
    across the past 7 days by directly updating the SQLite database."""
    section("Backdating timestamps in database")

    if not DB_PATH.exists():
        print(f"  ✗ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Gather emotion log IDs for this user, ordered by creation
    cur.execute(
        "SELECT id, conversation_id, message_id FROM emotion_logs WHERE user_id = ? ORDER BY id ASC",
        (user_id,),
    )
    logs = cur.fetchall()

    if not logs:
        print("  ✗ No emotion logs found for this user – nothing to backdate")
        conn.close()
        return

    # We only backdate the most recent 21 logs (the ones we just created)
    logs_to_update = logs[-21:] if len(logs) >= 21 else logs

    now = datetime.utcnow()
    updated_count = 0

    for idx, (log_id, conv_id, msg_id) in enumerate(logs_to_update):
        day_offset = idx // 3  # 3 messages per day → days 0..6
        msg_in_day = idx % 3   # 0, 1, 2 within the day

        # Target timestamp: (6 - day_offset) days ago + staggered hours
        target = now - timedelta(days=6 - day_offset, hours=-(9 + msg_in_day * 3))
        ts = target.strftime("%Y-%m-%d %H:%M:%S")

        cur.execute("UPDATE emotion_logs SET created_at = ? WHERE id = ?", (ts, log_id))

        if msg_id:
            cur.execute("UPDATE messages SET created_at = ? WHERE id = ?", (ts, msg_id))
            # Also update the assistant reply (next message id)
            cur.execute("UPDATE messages SET created_at = ? WHERE id = ?", (ts, msg_id + 1))

        if conv_id and msg_in_day == 0:
            cur.execute("UPDATE conversations SET created_at = ? WHERE id = ?", (ts, conv_id))

        updated_count += 1

    # Also backdate journal entries for this user
    cur.execute(
        "SELECT id, message_id FROM journal_entries WHERE user_id = ? ORDER BY id ASC",
        (user_id,),
    )
    journals = cur.fetchall()
    for j_id, j_msg_id in journals:
        if j_msg_id:
            cur.execute("SELECT created_at FROM messages WHERE id = ?", (j_msg_id,))
            row = cur.fetchone()
            if row and row[0]:
                cur.execute("UPDATE journal_entries SET created_at = ? WHERE id = ?", (row[0], j_id))

    conn.commit()
    conn.close()
    print(f"  ✔ Backdated {updated_count} emotion logs (+ associated messages, conversations, journals)")
    print(f"  ✔ Date range: {(now - timedelta(days=6)).strftime('%Y-%m-%d')} → {now.strftime('%Y-%m-%d')}")


# ---------------------------------------------------------------------------
# Insights verification
# ---------------------------------------------------------------------------

async def verify_insights(client: httpx.AsyncClient, token: str) -> None:
    section("Verifying insights endpoint")

    try:
        resp = await client.get(
            f"{BASE_URL}/api/emotions/insights/?days=7",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        )
        if resp.status_code != 200:
            print(f"  ✗ Insights endpoint returned HTTP {resp.status_code}: {resp.text[:300]}")
            return

        data = resp.json()
        print(f"  ✔ Status: 200 OK")
        print(f"  ✔ Total emotion logs:   {data.get('total_logs', 'N/A')}")
        print(f"  ✔ Dominant emotion:      {data.get('dominant_emotion', 'N/A')}")
        print(f"  ✔ Dominance %:           {data.get('dominance_pct', 'N/A')}")
        print(f"  ✔ Trend:                 {data.get('trend', 'N/A')}")
        print(f"  ✔ Volatility:            {data.get('volatility', 'N/A')}")
        print(f"  ✔ High risk:             {data.get('high_risk', 'N/A')}")

        freq = data.get("emotion_frequency", {})
        if freq:
            print(f"  ✔ Emotion frequency:")
            for emotion, count in sorted(freq.items(), key=lambda x: -x[1]):
                print(f"       {emotion:15s} → {count}")

        daily = data.get("daily_breakdown", {})
        if daily:
            print(f"  ✔ Daily breakdown ({len(daily)} days):")
            for day_key in sorted(daily.keys()):
                emotions_str = ", ".join(f"{e}={c}" for e, c in daily[day_key].items())
                print(f"       {day_key}: {emotions_str}")
        else:
            print("  ⚠ No daily breakdown returned (messages may need backdating)")

    except Exception as exc:
        print(f"  ✗ Failed to verify insights: {exc}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(skip_backdate: bool = False) -> None:
    banner("Serenity 7-Day User Journey Simulation")
    print(f"  Backend:  {BASE_URL}")
    print(f"  Database: {DB_PATH}")
    print(f"  User:     {TEST_USER['email']}")
    print(f"  Messages: {sum(len(msgs) for _, _, msgs in DAILY_MESSAGES)} total")
    print(f"  Backdate: {'SKIP' if skip_backdate else 'YES'}")

    start_time = time.time()

    async with httpx.AsyncClient() as client:
        # 1. Auth
        user_id, token = await signup_or_login(client)

        # 2. Send all messages through the real API
        stats = await run_simulation(client, user_id)

        # 3. Backdate timestamps
        if not skip_backdate and stats["total_success"] > 0:
            backdate_timestamps(user_id)

        # 4. Verify insights
        await verify_insights(client, token)

    elapsed = time.time() - start_time

    # 5. Summary
    banner("Simulation Summary")
    print(f"  Total messages sent:      {stats['total_sent']}")
    print(f"  Successful:               {stats['total_success']}")
    print(f"  Failed:                   {stats['total_failed']}")
    print(f"  Conversations created:    {len(stats['conversations'])}")
    print(f"  Crisis flags:             {stats['crisis_flags']}")
    print(f"  Timestamps backdated:     {'Yes' if not skip_backdate else 'Skipped'}")
    print(f"  Total time:               {elapsed:.1f}s")
    print()

    if stats["total_failed"] > 0:
        print("  ⚠ Some messages failed – check backend logs for details.")
    else:
        print("  ✔ All messages processed successfully!")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serenity 7-day journey simulation")
    parser.add_argument(
        "--skip-backdate",
        action="store_true",
        help="Skip the DB timestamp backdating step",
    )
    args = parser.parse_args()

    asyncio.run(main(skip_backdate=args.skip_backdate))
