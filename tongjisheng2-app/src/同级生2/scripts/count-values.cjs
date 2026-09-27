const s = `(1, '鸣泽唯', '女', 17, '主角名义上的妹妹，性格温顺', '身高158cm，栗色短发，蓝色发卡，穿家居服', '学生,义妹', '力量:25;敏捷:35;智力:55;意志:45;感知:55;魅力:70', NULL, '鸣泽家', '在场', '主角:义兄;美佐子:母亲', '由于父母再婚，与主角共同生活了十年的义妹。', 5, 0, 0, 30, '熟悉', 0, 0, 0, 'narisawa', 0, 0, 0, 0, 0, 'B', NULL, NULL, NULL, 158, NULL, NULL, NULL, NULL, NULL, 100, NULL, NULL, 100, '纤细', NULL, NULL, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 100, NULL, NULL, '家居服', '日常', 0, 0, '', '12-22 08:05')`;
let count = 0, inStr = false, depth = 0;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === "'" && s[i-1] !== "\\") inStr = !inStr;
  if (!inStr) {
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 1) count++;
  }
}
console.log("value count:", count + 1);
