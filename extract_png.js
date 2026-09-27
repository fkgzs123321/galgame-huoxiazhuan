const fs = require('fs');
const buf = fs.readFileSync('src/星月私立高等学院 MVU_3.9.6/星月私立高等学院 MVU_3.9.6.png');

// chara关键字在 2502606
const charaIdx = buf.indexOf('chara', 8);
const b64Start = charaIdx + 6; // 跳过 "chara\0"

// base64数据从b64Start开始，到IEND之前结束
// 搜索IEND
const iendIdx = buf.indexOf('IEND', b64Start);
console.log('IEND at:', iendIdx);

// 但可能base64数据中包含二进制，不是纯ASCII
// 让我们尝试从b64Start读取到文件末尾或IEND
const endPos = iendIdx > 0 ? iendIdx - 4 : buf.length;
let b64 = '';
for (let i = b64Start; i < endPos; i++) {
    const c = buf[i];
    // 只保留base64合法字符
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47 || c === 61) {
        b64 += String.fromCharCode(c);
    } else if (c === 10 || c === 13) {
        continue; // 跳过换行
    } else {
        // 遇到非base64字符就停止
        if (b64.length > 100) break;
    }
}

console.log('b64 length:', b64.length);
console.log('b64 first 100:', b64.substring(0, 100));

// 尝试解码
try {
    const raw = Buffer.from(b64, 'base64');
    console.log('decoded bytes:', raw.length);
    console.log('decoded first 200:', raw.toString('utf8').substring(0, 200));
    fs.writeFileSync('src/星月私立高等学院 MVU_3.9.6/星月解包.json', raw.toString('utf8'), 'utf8');
    console.log('saved to 星月解包.json');
} catch (e) {
    console.log('decode error:', e.message);
}
