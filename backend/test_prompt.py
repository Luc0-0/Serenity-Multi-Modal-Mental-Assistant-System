"""
Live prompt tester — prints EVERY question in full and applies strict scoring.
Run: python test_prompt.py
"""
import asyncio, httpx, json, re

ENDPOINT    = "https://ollama.com/v1/chat/completions"
MODEL       = "gpt-oss:120b-cloud"
API_KEY     = ""
MAX_TOKENS  = 4000
TEMPERATURE = 0.3

GOAL_TITLE       = "Run a half marathon in 3 months"
GOAL_DESCRIPTION = "I want to go from barely running 5k to completing a half marathon race"
THEME            = "balanced"

REQUIRED_IDS = ["physical", "mental", "lifestyle", "preferences"]
VALID_TYPES  = {"radio", "checkbox", "slider", "time"}

# ─────────────────────────────────────────────────────────────────────
# PROMPTS  — add/edit versions here
# ─────────────────────────────────────────────────────────────────────
PROMPTS = {

"v1_current": f"""You are an expert goal achievement strategist. Generate personalized onboarding questions for a user's goal.

CRITICAL OUTPUT RULE: Return a single valid JSON array. No markdown, no code fences, no comments, no trailing commas, no explanation. Pure JSON only — if it cannot be parsed by Python's json.loads() it is wrong.

GOAL:
- Title: {GOAL_TITLE}
- Description: {GOAL_DESCRIPTION}
- Theme: {THEME}

OUTPUT: A JSON array of exactly 4 category objects, in this exact order, with these exact IDs:
1. "physical" — Physical & Energy
2. "mental" — Mental & Focus
3. "lifestyle" — Lifestyle & Constraints
4. "preferences" — Preferences & Approach

Each category object:
{{
  "id": "<one of: physical | mental | lifestyle | preferences>",
  "name": "<category display name>",
  "description": "<one-line description>",
  "questions": [ /* 3 to 4 question objects */ ]
}}

QUESTION SCHEMAS (use exactly these fields, no extras):

TYPE "radio" — user picks ONE option:
{{
  "id": "<snake_case_unique_id>",
  "type": "radio",
  "question": "<question text>",
  "options": [
    {{"value": "<string>", "label": "<display label>", "recommended": true, "reason": "<why AI recommends this>"}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}}
  ]
}}
Rules: 3–4 options. Exactly ONE option has "recommended": true with a "reason" string. Others have "recommended": false (no "reason").

TYPE "checkbox" — user picks MULTIPLE options:
{{
  "id": "<snake_case_unique_id>",
  "type": "checkbox",
  "question": "<question text>",
  "options": [
    {{"value": "<string>", "label": "<display label>", "recommended": true, "reason": "<why recommended>"}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}}
  ]
}}
Rules: 3–5 options. Exactly ONE has "recommended": true with "reason". Others have "recommended": false.

TYPE "slider" — numeric range the user drags:
{{
  "id": "<snake_case_unique_id>",
  "type": "slider",
  "question": "<question text>",
  "min": <integer>,
  "max": <integer>,
  "step": <integer>,
  "unit": "<unit label, e.g. min or km or days — empty string if none>",
  "defaultValue": <integer within min–max>,
  "recommended": <integer within min–max>,
  "reason": "<why this value>"
}}

TYPE "time" — 24-hour time picker (use ONLY for wake-up time or bedtime questions):
{{
  "id": "<snake_case_unique_id>",
  "type": "time",
  "question": "<question text>",
  "defaultValue": "<HH:MM in 24h format>",
  "recommended": "<HH:MM in 24h format>",
  "reason": "<why this time>"
}}

STRICT CONTENT RULES:
- Use "time" type ONLY for wake-up or bedtime — maximum 1 time question per category
- Use "slider" for distances, durations, frequencies (km, min, days/week)
- Use "radio" for mutually exclusive choices (schedule type, experience level, etc.)
- Use "checkbox" for complementary selections (what resources you have, what motivates you)
- Every category must have exactly 3 questions
- Mix types — no category should have all the same type
- All question IDs must be globally unique (prefix with category: physical_wake_time)
- Questions must be directly about running a half marathon, not generic wellness

Return ONLY a valid JSON array. No markdown, no explanation, no trailing text.""",

"v3_refined": f"""Return a JSON array. Nothing else — no markdown, no prose, no code fences.

You build onboarding questions for a half marathon training app.
Goal: "{GOAL_TITLE}" — "{GOAL_DESCRIPTION}" (theme: {THEME})

The array has EXACTLY 4 objects in this order:
  [{{"id":"physical",...}}, {{"id":"mental",...}}, {{"id":"lifestyle",...}}, {{"id":"preferences",...}}]

Each object: {{"id":"<id>","name":"<name>","description":"<1 sentence>","questions":[<3 questions>]}}

QUESTION TYPES — pick the right tool:
• radio   → mutually exclusive choice (experience level, training plan style, injury history)
• checkbox → pick all that apply (equipment owned, cross-training activities, barriers)
• slider  → numeric value (current weekly km, long run distance, training days/week)
• time    → clock time — ONLY for wake-up or bedtime. Max 1 per category.

EXACT SCHEMAS (copy precisely, no extra fields):

radio:
{{"id":"physical_experience","type":"radio","question":"How would you describe your running experience?","options":[
  {{"value":"beginner","label":"Beginner — under 1 year","recommended":false}},
  {{"value":"intermediate","label":"Intermediate — 1–3 years","recommended":true,"reason":"Most half marathon first-timers fall here"}},
  {{"value":"advanced","label":"Advanced — 3+ years","recommended":false}}
]}}

checkbox:
{{"id":"physical_equipment","type":"checkbox","question":"What running gear do you already own?","options":[
  {{"value":"shoes","label":"Running shoes","recommended":true,"reason":"Non-negotiable for safe training"}},
  {{"value":"watch","label":"GPS watch","recommended":false}},
  {{"value":"foam_roller","label":"Foam roller","recommended":false}},
  {{"value":"heart_rate","label":"Heart rate monitor","recommended":false}}
]}}

slider:
{{"id":"physical_weekly_km","type":"slider","question":"How many km do you currently run per week?","min":0,"max":40,"step":2,"unit":"km","defaultValue":10,"recommended":15,"reason":"15 km/week is a safe starting base for half marathon training"}}

time:
{{"id":"lifestyle_wake_time","type":"time","question":"What time do you usually wake up?","defaultValue":"06:30","recommended":"06:30","reason":"Morning runs before work suit most training schedules"}}

RULES:
1. "recommended" in radio/checkbox options MUST be boolean true or false — never a string
2. Exactly ONE option per radio/checkbox has recommended:true with a "reason" — all others have recommended:false and NO "reason" field
3. slider defaultValue and recommended must be integers within [min, max]
4. time defaultValue and recommended must match regex ^\\d{{2}}:\\d{{2}}$ (e.g. "06:30")
5. All IDs unique, snake_case, prefixed with category (e.g. "physical_", "mental_", "lifestyle_", "preferences_")
6. Each category: exactly 3 questions, mixed types, no 2 questions of type "time" in same category
7. Questions must be specific to running a half marathon — not generic lifestyle questions

Output the array now:""",

}

# ─────────────────────────────────────────────────────────────────────
# ENGINE
# ─────────────────────────────────────────────────────────────────────

async def call_llm(prompt: str) -> str:
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": prompt}],
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(ENDPOINT, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


def extract_json(raw: str):
    start_arr = raw.find("[")
    start_obj = raw.find("{")
    if start_arr != -1 and (start_obj == -1 or start_arr < start_obj):
        end = raw.rfind("]") + 1
        js = raw[start_arr:end]
    elif start_obj != -1:
        end = raw.rfind("}") + 1
        js = raw[start_obj:end]
    else:
        raise ValueError("No JSON in response")

    try:
        return json.loads(js), "clean"
    except json.JSONDecodeError:
        pass

    s = re.sub(r"//[^\n]*", "", js)
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.DOTALL)
    s = re.sub(r",\s*([}\]])", r"\1", s)
    s = re.sub(r"\bTrue\b", "true", s)
    s = re.sub(r"\bFalse\b", "false", s)
    try:
        return json.loads(s), "regex_repaired"
    except json.JSONDecodeError:
        pass

    try:
        from json_repair import repair_json
        return json.loads(repair_json(s)), "library_repaired"
    except Exception as e:
        raise ValueError(f"All repair passes failed: {e}")


# ─────────────────────────────────────────────────────────────────────
# STRICT SCORER
# ─────────────────────────────────────────────────────────────────────

def strict_score(data, repair_level: str) -> dict:
    issues = []
    all_ids = []

    if not isinstance(data, list):
        return {"score": 0, "issues": ["Root is not a list"]}
    if len(data) != 4:
        issues.append(f"Expected 4 categories, got {len(data)}")

    found_ids = [c.get("id") for c in data if isinstance(c, dict)]
    for rid in REQUIRED_IDS:
        if rid not in found_ids:
            issues.append(f"Missing required category: {rid}")

    for cat in data:
        if not isinstance(cat, dict):
            continue
        cid = cat.get("id", "?")
        qs  = cat.get("questions", [])

        if not isinstance(qs, list):
            issues.append(f"{cid}: questions is not a list"); continue
        if len(qs) < 3:
            issues.append(f"{cid}: only {len(qs)} questions (need 3–4)")
        if len(qs) > 4:
            issues.append(f"{cid}: {len(qs)} questions (max 4)")

        type_counts = {}
        for q in qs:
            if not isinstance(q, dict): continue
            qid   = q.get("id", "")
            qtype = q.get("type", "")
            qtext = q.get("question", "")

            # global uniqueness
            if qid in all_ids:
                issues.append(f"{cid}/{qid}: duplicate ID")
            else:
                all_ids.append(qid)

            # ID should be prefixed
            if qid and not qid.startswith(cid[:4]):
                issues.append(f"{cid}/{qid}: ID not prefixed with category (e.g. {cid[:4]}_...)")

            # type valid
            if qtype not in VALID_TYPES:
                issues.append(f"{cid}/{qid}: unknown type '{qtype}'")
                continue

            type_counts[qtype] = type_counts.get(qtype, 0) + 1

            # question text
            if not qtext:
                issues.append(f"{cid}/{qid}: empty question text")

            if qtype in ("radio", "checkbox"):
                opts = q.get("options", [])
                if not isinstance(opts, list):
                    issues.append(f"{cid}/{qid}: options is not a list"); continue
                if len(opts) < 3:
                    issues.append(f"{cid}/{qid}: only {len(opts)} options (need 3+)")
                if len(opts) > 5:
                    issues.append(f"{cid}/{qid}: {len(opts)} options (max 5)")

                rec_count = 0
                for o in opts:
                    rec = o.get("recommended")
                    if not isinstance(rec, bool):
                        issues.append(f"{cid}/{qid}: recommended={rec!r} is not bool")
                    if rec is True:
                        rec_count += 1
                        if not o.get("reason"):
                            issues.append(f"{cid}/{qid}: recommended option missing 'reason'")
                    if rec is False and o.get("reason"):
                        issues.append(f"{cid}/{qid}: non-recommended option has 'reason' (should omit)")
                    if not o.get("value"):
                        issues.append(f"{cid}/{qid}: option missing 'value'")
                    if not o.get("label"):
                        issues.append(f"{cid}/{qid}: option missing 'label'")

                if rec_count == 0:
                    issues.append(f"{cid}/{qid}: no recommended option")
                elif rec_count > 1:
                    issues.append(f"{cid}/{qid}: {rec_count} recommended options (need exactly 1)")

            elif qtype == "slider":
                mn = q.get("min"); mx = q.get("max")
                dv = q.get("defaultValue"); rec = q.get("recommended")
                for field, val in [("min",mn),("max",mx),("step",q.get("step")),("defaultValue",dv),("recommended",rec)]:
                    if not isinstance(val, (int, float)):
                        issues.append(f"{cid}/{qid}: slider.{field} not a number (got {val!r})")
                if isinstance(mn,(int,float)) and isinstance(mx,(int,float)):
                    if mn >= mx:
                        issues.append(f"{cid}/{qid}: slider min({mn}) >= max({mx})")
                    if isinstance(dv,(int,float)) and not (mn <= dv <= mx):
                        issues.append(f"{cid}/{qid}: defaultValue {dv} outside [{mn},{mx}]")
                    if isinstance(rec,(int,float)) and not (mn <= rec <= mx):
                        issues.append(f"{cid}/{qid}: recommended {rec} outside [{mn},{mx}]")
                if not q.get("reason"):
                    issues.append(f"{cid}/{qid}: slider missing 'reason'")

            elif qtype == "time":
                for field in ("defaultValue","recommended"):
                    v = str(q.get(field,""))
                    if not re.match(r"^\d{2}:\d{2}$", v):
                        issues.append(f"{cid}/{qid}: time.{field}={v!r} not HH:MM")
                if not q.get("reason"):
                    issues.append(f"{cid}/{qid}: time missing 'reason'")

        # max 1 time per category
        if type_counts.get("time", 0) > 1:
            issues.append(f"{cid}: {type_counts['time']} time questions (max 1 per category)")

        # all same type
        unique_types = set(type_counts.keys())
        if len(unique_types) == 1 and len(qs) >= 3:
            issues.append(f"{cid}: all {len(qs)} questions are the same type '{list(unique_types)[0]}' — mix types")

    repair_penalty = {"clean": 0, "regex_repaired": 10, "library_repaired": 25}.get(repair_level, 30)
    base = max(0, 100 - len(issues) * 8 - repair_penalty)
    return {"score": base, "issues": issues, "repair": repair_level}


def print_full_content(data):
    """Print every question and option so we can review quality."""
    if not isinstance(data, list):
        print("  (not a list)")
        return
    for cat in data:
        if not isinstance(cat, dict): continue
        print(f"\n  ┌─ [{cat.get('id','?')}] {cat.get('name','')} ─────────────────")
        print(f"  │  {cat.get('description','')}")
        for q in cat.get("questions", []):
            if not isinstance(q, dict): continue
            qtype = q.get("type","?")
            print(f"  │")
            print(f"  │  [{qtype}] {q.get('question','')}")
            if qtype in ("radio", "checkbox"):
                for o in q.get("options", []):
                    rec  = "★ " if o.get("recommended") else "  "
                    why  = f"  ← {o.get('reason','')}" if o.get("reason") else ""
                    print(f"  │       {rec}{o.get('label','')} (value={o.get('value','')}){why}")
            elif qtype == "slider":
                print(f"  │       range: {q.get('min')}–{q.get('max')} {q.get('unit','')}  "
                      f"default={q.get('defaultValue')}  recommended={q.get('recommended')}  ← {q.get('reason','')}")
            elif qtype == "time":
                print(f"  │       default={q.get('defaultValue')}  recommended={q.get('recommended')}  ← {q.get('reason','')}")
        print(f"  └{'─'*55}")


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

async def main():
    results = {}
    for name, prompt in PROMPTS.items():
        print(f"\n{'='*65}")
        print(f"  PROMPT: {name}")
        print(f"{'='*65}")

        try:
            raw = await call_llm(prompt)
        except Exception as e:
            print(f"  ❌  API call failed: {e}"); results[name] = {"score":0,"issues":[str(e)],"repair":"api_error"}; continue

        try:
            data, repair_level = extract_json(raw)
        except Exception as e:
            print(f"  ❌  JSON extraction failed: {e}")
            print(f"  RAW (full):\n{raw}")
            results[name] = {"score":0,"issues":[str(e)],"repair":"parse_error"}; continue

        # Print full content for human review
        print_full_content(data)

        result = strict_score(data, repair_level)
        results[name] = result

        print(f"\n  SCORE: {result['score']}/100  repair={repair_level}")
        if result["issues"]:
            print("  Issues:")
            for i in result["issues"]:
                print(f"    ✗ {i}")
        else:
            print("  ✅  Perfect on all strict checks")

    print(f"\n{'='*65}")
    print("SUMMARY")
    print(f"{'='*65}")
    for name, r in sorted(results.items(), key=lambda x: -x[1]["score"]):
        print(f"  {r['score']:3d}/100  {name}  (repair={r['repair']})")
    best = max(results, key=lambda k: results[k]["score"])
    print(f"\n  Winner: {best}  ({results[best]['score']}/100)")

if __name__ == "__main__":
    asyncio.run(main())
