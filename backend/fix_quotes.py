import re

with open('app/services/ollama_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix all the extra quotes
content = content.replace('- Hint at understanding: "I\'ve felt that way too""""', '- Hint at understanding: "I\'ve felt that way too"""')
content = content.replace('- Protective: "I got you""""', '- Protective: "I got you"""')
content = content.replace('- Be over-the-top""""', '- Be over-the-top"""')
content = content.replace('- Then: "What do you want to do about it?""""', '- Then: "What do you want to do about it?"""')
content = content.replace('- "honestly" / "wait" / "lol""""', '- "honestly" / "wait" / "lol"""')

with open('app/services/ollama_service.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all quote issues")
