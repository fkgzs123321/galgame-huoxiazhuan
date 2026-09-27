// ① 推演链 → 思维链（改名，同步 state / 校验器）
// ② 精简：删掉与 出招 / 交互循环 重复的部分，只留「按什么顺序推演」
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ── ① 写精简后的思维链 ── */
const 内容 = `每层输出前按顺序推演:
  第一步 读状态:
    - 四态（在线/暂停/离线/冻结）、反抗值、体力
    - 她那边：人设（八个里哪一个）、熟练度、情绪、兴奋度、目的进度、身体、刚才说的
    - 局面：第几天、当前女角、上一层的场面与留痕
    - 已封死的路、已知软肋

  第二步 她决策:
    - 按她人设的「诉求」+ 性癖 + 情绪 + 兴奋度挑
    - 从四处取（按顺序）：当日选项池 → 在场女角的选项池 → 公共选项池
    - 固定四条（不许少），至少一条「微」；措辞可改，等级照抄；只挑不编
    - 掷误点；兴奋度 80 以上改自由打字

  第三步 摆出选项:
    - 每条写 文本 / 等级 / 感觉，键名 "1" "2" "3" "4"
    - 写进 局面.当前选项

  第四步 判定:
    - 只在「拒绝」或「自己来」时走；照抄 局面.判定结果，不重算
    - 反抗不够就拒不了 —— 写他按不下去的那一下

  第五步 结算:
    - 目的进度（按她那一段的规则）／游戏进度／女角三部位与关系
    - 身体账单／场面／她那一侧（只看 <user> 隔着屏幕看得见的）／她的原话

  第六步 叙述:
    - 按 叙述准则 + 当前开着的那条文风写
    - 四段：她点了哪条 → 他的反应（照做/反抗/自定义）→ 演绎做完整 → 尾部新四条

  第七步 变量更新:
    - 按输出格式输出更新块；路径写 /局面/当前选项，不带 stat_data

  第八步 闭合自检:
    - 演完了吗？尾部有新四条吗？新选项跟本层有关吗？

约束:
  - 数值由公式与骰子定，不得即兴改
  - 不得跳过「她决策」直接给结果；不得替 <user> 决定拒不拒
  - 她那一侧一个字都不写她心里想什么
`;

const 新路径 = path.join(D, '世界书/扮演准则/思维链.yaml');
fs.writeFileSync(新路径, 内容);
console.log('✅ 已建 世界书/扮演准则/思维链.yaml（' + fs.statSync(新路径).size + ' 字节，原推演链 4,309）');
try { YAML.parse(内容); console.log('   YAML ✅'); } catch (e) { console.log('   ⚠ ' + e.message.split('\n')[0].slice(0, 50)); }

/* 删旧文件 */
const 旧路径 = path.join(D, '世界书/扮演准则/推演链.yaml');
if (fs.existsSync(旧路径)) { fs.rmSync(旧路径); console.log('✅ 已删除 推演链.yaml'); }

/* ── ② state 改名 ── */
const sp = path.join(D, 'tavern-cards-state.json');
const S = JSON.parse(fs.readFileSync(sp, 'utf8'));
const 旧条 = S.entryManifest.扮演准则['推演链'];
if (旧条) {
  delete S.entryManifest.扮演准则['推演链'];
  旧条.path = '世界书/扮演准则/思维链.yaml';
  S.entryManifest.扮演准则['思维链'] = 旧条;
  console.log('✅ state：推演链 → 思维链');
}
fs.writeFileSync(sp, JSON.stringify(S, null, 2));

/* ── ③ 校验器里的名字也改（否则它认不出这条，会算到别的层）── */
const vp = path.join('E:/Games/写卡/tavern_helper_template', 'src/旮旯给木-同级生2/scripts/verify-prompt-budget.mjs');
let v = fs.readFileSync(vp, 'utf8');
if (v.includes("'推演链'")) {
  v = v.replace("'推演链'", "'思维链'");
  fs.writeFileSync(vp, v);
  console.log('✅ 校验器：T0_NAMES 里的 推演链 → 思维链');
}
console.log('\n扮演准则组: ' + Object.keys(S.entryManifest.扮演准则).join(' / '));
