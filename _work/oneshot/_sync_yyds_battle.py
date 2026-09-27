import json

with open('src/欲望都市/欲望都市.json', encoding='utf-8') as f:
    data = json.load(f)
d = data['data']

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

# 用源文件最新内容替换 JSON 条目 content
with open('src/欲望都市/世界书/变量/叙事输出规范.yaml', encoding='utf-8') as f:
    new_narr = f.read()
with open('src/欲望都市/世界书/变量/变量更新规则.yaml', encoding='utf-8') as f:
    new_rules = f.read()

n = 0
for e in find_wb(d):
    c = e.get('comment', '')
    if c == '[mvu_plot]叙事输出规范':
        # JSON content 是 yaml 内容(带 @@generate_before? 检查)
        if '占位符协议' in e['content']:
            old = e['content']
            # 用源文件内容替换(JSON 里可能是纯 yaml 或带装饰器,按源文件为准)
            e['content'] = new_narr
            n += 1
            print(f'[{c}] 已同步源文件内容 ({len(old)}→{len(new_narr)})')
    elif c == '[mvu_update]变量更新规则':
        if '战斗状态' in e['content']:
            old = e['content']
            e['content'] = new_rules
            n += 1
            print(f'[{c}] 已同步源文件内容 ({len(old)}→{len(new_rules)})')

with open('src/欲望都市/欲望都市.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
print(f'JSON 同步 {n} 处')

# 验证
with open('src/欲望都市/欲望都市.json', encoding='utf-8') as f:
    t = f.read()
print('JSON 含 开战当轮:', '战斗开始当轮' in t)
print('JSON 含 开战占位符:', '战斗开始）时，消息末尾必须输出' in t)
