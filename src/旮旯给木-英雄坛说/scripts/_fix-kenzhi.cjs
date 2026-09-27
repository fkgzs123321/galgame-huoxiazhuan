// 修「一回合」里的打击结算：克制的语义搞反了
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/机制/战斗引擎.txt';
let t = fs.readFileSync(p, 'utf8');

const 旧 = `  function _打击(行动, 攻方, 守方, 守行动, 攻场) {
    var _倍 = this.行动伤害倍(行动);
    if (_倍 <= 0) return null;
    var _克 = this.克制(行动, 守行动);
    if (_克.结果 === '无效') return { 无效: true, 说明: _克.说明 };
    var _raw = 攻方.攻击 * _倍 * (攻场.伤倍 || 1);
    var _挡 = 守方.格挡 || 0;
    var _dmg = Math.max(1, Math.round(_raw - _挡));
    if (_克.结果 === '减伤') {
      var _系 = _克.系数;
      if (攻场 && 守行动 === '防御') { /* 保持 */ }
      _dmg = Math.max(1, Math.round(_dmg * _系));
    }
    return { 伤害: _dmg, 说明: _克.说明 };
  }`;

const 新 = `  /* ★ 克制(A,B) 的语义是「A 压制 B」→ 返回的是【对 B 的影响】
     所以：
       我这招被压住   ⇐  克制(对方的行动, 我的行动) 返回「无效」
       我这招被打折   ⇐  克制(我的行动, 对方的行动) 返回「减伤」
     （原实现把这两件事搞反了 —— 测试抓出来的） */
  function _打击(行动, 守行动, 攻方, 守方, 攻场) {
    var _倍 = this.行动伤害倍(行动);
    if (_倍 <= 0) return null;

    /* ① 我方这一招是否被对方压住 */
    var _被压 = this.克制(守行动, 行动);
    if (_被压.结果 === '无效') return { 无效: true, 说明: _被压.说明 };

    /* ② 我方这一招打出去，是否被对方的守势打折 */
    var _自 = this.克制(行动, 守行动);
    var _系 = (_自.结果 === '减伤') ? (Number(_自.系数) || 1) : 1;

    var _raw = 攻方.攻击 * _倍 * (攻场.伤倍 || 1);
    var _挡 = 守方.格挡 || 0;
    var _dmg = Math.max(1, Math.round((_raw - _挡) * _系));
    return { 伤害: _dmg, 说明: _自.说明 || _被压.说明 || '' };
  }`;

if (!t.includes(旧)) { console.error('没匹配上'); process.exit(1); }
t = t.replace(旧, 新);

// 调用处也要改参数顺序（行动, 守行动, 攻方, 守方, 攻场）
t = t.replace(
  "  var _我打 = _打击.call(this, _我行动, _新我, _新敌, _敌行动, _我场);\n  var _敌打 = _打击.call(this, _敌行动, _新敌, _新我, _我行动, _敌场);",
  "  var _我打 = _打击.call(this, _我行动, _敌行动, _新我, _新敌, _我场);\n  var _敌打 = _打击.call(this, _敌行动, _我行动, _新敌, _新我, _敌场);"
);

fs.writeFileSync(p, t);
console.log('✅ 已修：克制的方向（行动, 守行动, 攻方, 守方, 攻场）');
