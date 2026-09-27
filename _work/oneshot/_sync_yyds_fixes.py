import json, re

with open('src/欲望都市/欲望都市.json', encoding='utf-8') as f:
    data = json.load(f)
d = data['data']

# ===== 1. InitVar 条目 content: 学业总分 520→420 =====
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

entries = find_wb(d)
n_init = 0
for e in entries:
    if 'InitVar' in e.get('comment', ''):
        if '520' in e['content']:
            e['content'] = re.sub(r'(学业总分:\s*)520', r'\g<1>420', e['content'])
            n_init += 1
print(f'InitVar 条目: {n_init} 处 520→420')

# ===== 2. Zod 脚本 content =====
scripts = {s['name']: s for s in d['extensions']['tavern_helper']['scripts']}
zod = scripts['Zod']
zc = zod['content']
z0 = zc
zc = zc.replace('prefault(520)', 'prefault(420)')
zc = zc.replace(
    '学业总分: z.coerce.number().transform(v => _.clamp(v, 0, 750))',
    '学业总分: z.coerce.number().transform(v => _.clamp(Array.isArray(v) ? Number(v[0]) : v, 0, 750))')
zc = zc.replace(
    '体力: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(80)',
    '体力: z.coerce.number().transform(v => _.clamp(Array.isArray(v) ? Number(v[0]) : v, 0, 100)).prefault(80)')
zc = zc.replace(
    '性欲: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(30)',
    '性欲: z.coerce.number().transform(v => _.clamp(Array.isArray(v) ? Number(v[0]) : v, 0, 100)).prefault(30)')
zc = zc.replace(
    '勃起度: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(10)',
    '勃起度: z.coerce.number().transform(v => _.clamp(Array.isArray(v) ? Number(v[0]) : v, 0, 100)).prefault(10)')
zod['content'] = zc
print('Zod 脚本:', '✓ 学业420 + transform 兼容数组' if zc != z0 else '⚠ 未变')

# ===== 3. regex_scripts HTML 定向替换 =====
num_old = 'function num(v,d){v=parseFloat(v);d=(d===undefined)?0:d;return isNaN(v)?d:v}'
num_new = 'function num(v,d){if(Array.isArray(v))v=v[0];v=parseFloat(v);d=(d===undefined)?0:d;return isNaN(v)?d:v}'
for r in d['extensions']['regex_scripts']:
    name = r.get('scriptName', '')
    rs = r.get('replaceString', '')
    r0 = rs
    if name in ('状态栏界面', '战斗面板界面'):
        rs = rs.replace('学业总分:520', '学业总分:420')
        if num_old in rs:
            rs = rs.replace(num_old, num_new)
        rs = rs.replace("esc(p.学业总分||0)", "esc(num(p.学业总分,0))")
    if rs != r0:
        r['replaceString'] = rs
        print(f'  正则 {name}: ✓ 同步({len(r0)}→{len(rs)})')

with open('src/欲望都市/欲望都市.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
print('JSON 已保存')
