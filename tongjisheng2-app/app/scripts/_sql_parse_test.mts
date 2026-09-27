import { parseSqlStatement, splitSqlStatements } from '../src/runtime/sql-executor';

const cases: string[] = [
  "INSERT INTO global_state (row_id, current_location, current_minor_region, current_major_region, prev_scene_time, elapsed_time, cur_time) VALUES (1, '御苑', '新宿区', '东京都', NULL, '0分钟', '2024-04-01 09:00')",
  "UPDATE global_state SET prev_scene_time = '2024-04-01 09:00', elapsed_time = '3小时20分', cur_time = '2024-04-01 12:20' WHERE row_id = 1",
  "UPDATE world_map_points SET exploration_status = '已探索', environment_desc = '树木繁茂,发现隐藏神殿' WHERE location_name = '御苑'",
  "INSERT INTO world_map_points (row_id, location_name, minor_region, major_region, location_type, environment_desc, importance, exploration_status) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM world_map_points), '新宿车站', '新宿区', '东京都', '交通', '繁忙的地下换乘枢纽,人流密集', '普通', '已探索')",
  "INSERT INTO chronicle (row_id, code_index, time_span, summary, chronicle_text) VALUES (?, 'bad_ending_001', '1995-12-??', 'BAD END: 报警结局', '主角因强制猥亵被警察带走,存档锁定')",
  "UPDATE global_state SET flags_text = 'bad_ending_报警结局:主角因强制猥亵被警察带走' WHERE row_id = 1",
  "DELETE FROM inventory WHERE item_name = '过期道具' AND quality IN ('普通','优秀')",
  'CREATE TABLE IF NOT EXISTS global_state (row_id INTEGER PRIMARY KEY)',
  "UPDATE important_npc SET affection = 5 WHERE name = '鸣泽美佐子'",
];

let fail = 0;
for (const sql of cases) {
  const parsed = parseSqlStatement(sql);
  const tag = parsed.type + (parsed.table ? ' -> ' + parsed.table : '');
  const detail =
    parsed.type === 'INSERT'
      ? ' cols=' + parsed.columns!.length
      : parsed.type === 'UPDATE'
        ? ' sets=' + (parsed.sets || []).length + ' where=' + JSON.stringify(parsed.where)
        : parsed.type === 'DELETE'
          ? ' where=' + JSON.stringify(parsed.where)
          : '';
  console.log((parsed.type === 'UNKNOWN' ? 'FAIL' : 'OK  ') + ' | ' + tag + detail);
  if (parsed.type === 'UNKNOWN') fail++;
}

const split = splitSqlStatements(
  "UPDATE global_state SET flags_text = 'a;b' WHERE row_id = 1; UPDATE x SET y = 2;",
);
console.log('split test:', JSON.stringify(split));
console.log(fail === 0 ? 'ALL PARSE OK' : fail + ' FAILED');
