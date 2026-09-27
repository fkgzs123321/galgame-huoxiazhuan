import fs from 'fs';
for (const f of ['.skills/tavern-cards/references/contents-creation/character/逐角色终检表.md',
                 '_tc_repo/tavern-cards/references/contents-creation/character/逐角色终检表.md']) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('模糊指代')) { console.log('已有'); continue; }
  s = s.replace('- [ ] 气味段**只写体味**',
    '- [ ] **模糊指代 0**：搜「那两团／那两瓣／那道沟／那两点／那处／那里／那东西」——**每一处器官初次出现必须点名器官 ＋ 带脏／臭／腥定语**\n- [ ] 气味段**只写体味**');
  fs.writeFileSync(f, s, 'utf8');
  console.log('✓ 终检表加「模糊指代」项 ' + f);
}
