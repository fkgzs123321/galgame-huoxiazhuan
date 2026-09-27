import json, re

# ===== 1. 源文件: schema.ts 对象 prefault + 变量字典 yaml =====
with open('src/欲望都市/schema.ts', encoding='utf-8') as f:
    s = f.read()
s0 = s
s = s.replace('prefault({ 学业总分: 520', 'prefault({ 学业总分: 420')
with open('src/欲望都市/schema.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('schema.ts 对象 prefault:', '✓ 520→420' if s != s0 else '(未变)')

with open('src/欲望都市/世界书/变量/变量字典与范围.yaml', encoding='utf-8') as f:
    vd = f.read()
vd0 = vd
vd = vd.replace('学业总分: 520（0~750）', '学业总分: 420（0~750）')
with open('src/欲望都市/世界书/变量/变量字典与范围.yaml', 'w', encoding='utf-8') as f:
    f.write(vd)
print('变量字典 yaml:', '✓ 520→420' if vd != vd0 else '(未变)')

# ===== 2. JSON =====
with open('src/欲望都市/欲望都市.json', encoding='utf-8') as f:
    data = json.load(f)
d = data['data']

# 2a. first_mes + alternate_greetings 里的 initvar override
n_fm = 0
if '学业总分: 520' in d['first_mes']:
    d['first_mes'] = d['first_mes'].replace('学业总分: 520', '学业总分: 420')
    n_fm += 1
for i, g in enumerate(d.get('alternate_greetings', [])):
    if '学业总分: 520' in g:
        d['alternate_greetings'][i] = g.replace('学业总分: 520', '学业总分: 420')
        n_fm += 1
print(f'开场白 initvar override: {n_fm} 处 520→420')

# 2b. Zod 脚本对象 prefault
scripts = {s['name']: s for s in d['extensions']['tavern_helper']['scripts']}
zc = scripts['Zod']['content']
z0 = zc
zc = zc.replace('prefault({ 学业总分: 520', 'prefault({ 学业总分: 420')
scripts['Zod']['content'] = zc
print('Zod 对象 prefault:', '✓' if zc != z0 else '(未变)')

# 2c. 变量字典条目 content
def find_wb(o):
    if isinstance(o, dict):
        if 'entries' in o and isinstance(o['entries'], list): return o['entries']
        for v in o.values():
            r = find_wb(v)
            if r is not None: return r
    elif isinstance(o, list):
        for v in o:
            r = find_wb(v)
            if r is not None: return r
    return None
n_vd = 0
for e in find_wb(d):
    if '变量字典' in e.get('comment', '') and '520' in e['content']:
        e['content'] = e['content'].replace('学业总分: 520（0~750）', '学业总分: 420（0~750）')
        n_vd += 1
print(f'变量字典条目: {n_vd} 处')

with open('src/欲望都市/欲望都市.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

# ===== 3. 最终核查 =====
with open('src/欲望都市/欲望都市.json', encoding='utf-8') as f:
    t = f.read()
rem = re.findall(r'学业总分[^\n,}]{0,10}520', t)
print('\n最终残留 学业总分.*520:', rem if rem else '无 ✓')
