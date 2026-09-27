import fs from "fs";
const text = fs.readFileSync('src/欲望都市/创作规划.yaml', 'utf8');
const m = text.match(/^characters:\n([\s\S]*?)(?=^\S|\Z)/m);
const sec = m ? m[1] : '';
const re = /- name: (\S+)\n([\s\S]*?)(?=- name:|\Z)/g;
let mm, students = [], mothers = [], teachers = [], other = [];
while ((mm = re.exec(sec)) !== null) {
  const name = mm[1], block = mm[2];
  const basic = block.match(/basic: \{[^}]*\}/);
  if (!basic) continue;
  const idm = basic[0].match(/identity: ([^,}]+)/);
  const identity = idm ? idm[1] : '?';
  if (identity.includes('学生')) students.push(name);
  else if (identity.includes('妈妈')) mothers.push(name);
  else if (identity.includes('老师')) teachers.push(name);
  else other.push(name + ':' + identity);
}
console.log('学生(' + students.length + '): ' + students.join(', '));
console.log();
console.log('妈妈(' + mothers.length + '): ' + mothers.join(', '));
console.log();
console.log('老师(' + teachers.length + '): ' + teachers.join(', '));
console.log();
console.log('其他(' + other.length + '): ' + other.join('; '));
