// 从旧打包好的角色卡 PNG 里剥出纯头像（去掉 tEXt/zTXt/iTXt 元数据块）
import fs from 'node:fs';

const SRC = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/_旧版归档_20260923/系统哥的末日.png';
const DST = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/avatar.png';

const buf = fs.readFileSync(SRC);
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!buf.subarray(0, 8).equals(SIG)) throw new Error('不是合法 PNG');

const parts = [SIG];
let pos = 8;
let dropped = 0;

while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('latin1', pos + 4, pos + 8);
  const total = 8 + len + 4; // len + type + data + crc
  const chunk = buf.subarray(pos, pos + total);

  if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
    dropped++;
  } else {
    parts.push(chunk);
  }

  pos += total;
  if (type === 'IEND') break;
}

const out = Buffer.concat(parts);
fs.writeFileSync(DST, out);
console.log('源大小', buf.length, '→ 头像大小', out.length, '；丢弃元数据块', dropped, '个');
console.log('写入', DST);
