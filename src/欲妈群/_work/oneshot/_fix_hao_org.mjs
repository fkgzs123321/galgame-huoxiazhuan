import fs from 'fs';
const F = '世界书/郝佳期_基础信息.txt';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
const i = lines.findIndex(l => /^### 高潮$/.test(l));
if (i < 0) { console.log('MISS 高潮节'); process.exit(1); }
let j = i + 1; while (j < lines.length && !/^### |^## /.test(lines[j])) j++;
const 新 = '她这边：两片厚屄唇被撑到发白，骚屄里那圈熟肉一阵紧过一阵，脚趾蜷起、腰弓成一道弧，嗓子拔到最高那一下破了音，一大股骚腥的骚水顺着屁股沟涌出来，把床单洇出一大片黄印。她没有马上收拾，先伸手把床头那部手机够过来，两条腿分开对着自己被喷湿的那一摊拍了两张，裁掉脸，配一句「我家这个其实也就那样」发进群；发完把手机扣在桌上，把内裤从床头够过来，捏着裆那块布凑到鼻子底下闻了一遍，闻完塞进枕头底下留着明天穿，那摊湿的一整晚不擦。他那头：先莫名硬到发胀、卵袋缩紧、腰酸得直不起，然后不受控地射，射得又浓又多，内裤前面整片湿透，全身过电，脑子一片空白；事后困惑、疲惫、不敢问一个字。';
lines.splice(i + 1, j - i - 1, 新);
fs.writeFileSync(F, lines.join(eol), 'utf8');
console.log('✓ 郝佳期高潮已换成她自己的招牌动作（拍照发群 → 闻内裤塞枕头）');
