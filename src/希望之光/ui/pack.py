import json
import os
import re

html_file = r'e:\Games\写卡\tavern_resource-main\src\角色卡\希望之光\ui\01_希望之光UI框架_正式精简版.html'
json_file = r'e:\Games\写卡\tavern_resource-main\src\角色卡\希望之光\01_希望之光_正式版沉浸控制台.json'

with open(html_file, 'r', encoding='utf-8') as f:
    full_content = f.read()

# 1. 提取 JS 部分 (tavern_helper 脚本)
js_match = re.search(r'<script>(.*?)</script>', full_content, re.DOTALL)
ui_js = js_match.group(1).strip() if js_match else ""

# 2. 提取并清理 HTML 部分 (Regex 脚本)
html_content = re.sub(r'<script>.*?</script>', '', full_content, flags=re.DOTALL)
html_content = html_content.replace('id="hl-login-view" class="hl-view"', 'id="hl-login-view" class="hl-view active"')

# 3. 生成 Regex 对象
regex_obj = [
  {
    "id": "hope_light_ui_spa_final",
    "scriptName": "【希望之光】正式版沉浸控制台",
    "disabled": False,
    "runOnEdit": True,
    "findRegex": "(【开局】[\\s\\S]*?开始入职登记[^\\n]*)",
    "replaceString": "$1\n" + html_content,
    "trimStrings": [],
    "placement": [2],
    "substituteRegex": 0,
    "minDepth": None,
    "maxDepth": None,
    "markdownOnly": True,
    "promptOnly": False
  }
]

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(regex_obj, f, ensure_ascii=False, indent=2)

print(f"Generated regex JSON at: {json_file}")

# 4. 注入母亲卡
mother_card_path = r'e:\Games\写卡\tavern_resource-main\src\角色卡\希望之光\希望之光.json'
output_card_path = r'e:\Games\写卡\tavern_resource-main\src\角色卡\希望之光\希望之光_正式版.json'

with open(mother_card_path, 'r', encoding='utf-8') as f:
    card = json.load(f)

extensions = card.get('data', {}).get('extensions', {})

# 保持数据隐藏脚本
scripts_to_keep_ids = [
    "9b2b18e4-85bb-4b37-b3f5-df0b1c1b2001",
    "9b2b18e4-85bb-4b37-b3f5-df0b1c1b2002",
    "9b2b18e4-85bb-4b37-b3f5-df0b1c1b2003",
]

old_regex = extensions.get('regex_scripts', [])
new_regex = [s for s in old_regex if s.get('id') in scripts_to_keep_ids]
new_regex.extend(regex_obj)
extensions['regex_scripts'] = new_regex

# 5. 注入 TavernHelper 脚本
th_data = extensions.get('tavern_helper', {"scripts": []})
if not isinstance(th_data, dict):
    th_data = {"scripts": []}
if "scripts" not in th_data or not isinstance(th_data["scripts"], list):
    th_data["scripts"] = []

# 过滤掉旧驱动
th_data["scripts"] = [s for s in th_data["scripts"] if isinstance(s, dict) and s.get('title') != "UI 主控驱动"]

# 添加新驱动
th_data["scripts"].append({
    "title": "UI 主控驱动",
    "content": ui_js,
    "disabled": False
})

extensions['tavern_helper'] = th_data
extensions['TavernHelper_scripts'] = th_data["scripts"]

card['data']['extensions'] = extensions
card['data']['character_version'] = "2.2.0-SPA-FIX-V2"

with open(output_card_path, 'w', encoding='utf-8') as f:
    json.dump(card, f, ensure_ascii=False, indent=2)

print(f"Final card (Split) packaged at: {output_card_path}")
print(f"JS Length: {len(ui_js)}")
