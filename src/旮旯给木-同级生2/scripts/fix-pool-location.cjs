// 修正池子的真实位置：本卡是「17 天制」，池子在 时间线/plot/第NN天.yaml → 第NN天.当日选项池
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ① 出招.yaml：把「当前关卡」改成「当前那一天」 */
{
  const p = path.join(D, '世界书/世界观/引擎/出招.yaml');
  const t0 = fs.readFileSync(p, 'utf8');
  let t = t0
    .replace(/当前关卡/g, '当前那一天')
    .replace(/那一关的选项池/g, '那一天的当日选项池')
    .replace(/当前关卡的选项池/g, '当前那一天的当日选项池')
    .replace(/取当前那一天的当日选项池/g, '取当前那一天的当日选项池')
    .replace(/池子是当前/g, '池子是当前');
  fs.writeFileSync(p, t);
  console.log('✅ 出招.yaml：「当前关卡」→「当前那一天」（' + (t0.length !== t.length ? '已改' : '无变化') + '）');
  try { YAML.parse(t); console.log('   YAML ✅'); } catch (e) { console.log('   ⚠ ' + e.message.split('\n')[0].slice(0, 50)); }
}

/* ② [mvu_update]选项池输出：改引用路径 */
{
  const p = path.join(D, '世界书/变量/选项池输出.yaml');
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(
    /池子去哪读[\s\S]*?(?=\n选项从这三处取)/,
    `池子去哪读（这三个条目在你上下文里，直接引用里面的内容，不要另编）：
  当日选项池 →「第NN天」条目里的 第NN天.当日选项池（NN = 当前的日期）
  女角池     →「<在场女角名>」条目里的 她的选项池
  公共池     →「公共选项池」条目里的 池子

`
  ).replace(/1\. 当前关卡的选项池/g, '1. 当前那一天的 当日选项池');
  fs.writeFileSync(p, t);
  console.log('✅ 选项池输出：引用改成「第NN天.当日选项池」');
}

/* ③ 确认时间线条目在卡里 */
const j = JSON.parse(fs.readFileSync(path.join(D, '旮旯给木-同级生2.json'), 'utf8'));
const e = ((j.data || j).character_book || {}).entries || [];
const 天 = e.filter(x => /第\d+天/.test(x.comment || ''));
console.log('\n时间线条目在卡里: ' + 天.length + ' 条（' + 天.slice(0, 3).map(x => x.comment).join(' / ') + ' …）');
