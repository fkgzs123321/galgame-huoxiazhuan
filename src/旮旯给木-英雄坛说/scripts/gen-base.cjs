// ════════════════════════════════════════════════════════════
// gen-base.cjs · 底座内容生成器（只做 世界观 + 地理）
//
// 数据源：底座_yingxiong/世界观源.yaml、底座_yingxiong/地理源.yaml
// 女角不在这里 —— 见 scripts/gen-characters.cjs（读 底座_yingxiong/女角设定.yaml）
//
// 职责分开的原因：女角内容量大、改动频繁，跟世界观/地理不是一个节奏。
// 混在一个脚本里，改女角就得把世界观地理一起重刷。
//
// 用法: node scripts/gen-base.cjs
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const WB = path.join(D, '世界书');

const 世界观 = YAML.parse(fs.readFileSync(path.join(D, '底座_yingxiong/世界观源.yaml'), 'utf8'));
const 地理 = YAML.parse(fs.readFileSync(path.join(D, '底座_yingxiong/地理源.yaml'), 'utf8'));

const 写 = (p, o) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0, defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN' }));
};

const 注册清单 = { 世界观: {}, 地理: {} };

for (const [名, 内容] of Object.entries(世界观)) {
  写(path.join(WB, '世界观', '底座_yingxiong', 名 + '.yaml'), 内容);
  注册清单.世界观[名] = { path: `世界书/世界观/底座_yingxiong/${名}.yaml` };
}

for (const [名, 内容] of Object.entries(地理)) {
  写(path.join(WB, '地理', 名 + '.yaml'), 内容);
  注册清单.地理[名] = { path: `世界书/地理/${名}.yaml`, keywords: 内容.关键词 || [名] };
}

fs.writeFileSync(path.join(D, 'scripts', 'gen-base-manifest.json'), JSON.stringify(注册清单, null, 1));

console.log('世界观与地理生成完毕');
console.log(`  世界观 ${Object.keys(世界观).length} 条`);
console.log(`  地理   ${Object.keys(地理).length} 条`);
console.log('  女角   → 见 gen-characters.cjs');
