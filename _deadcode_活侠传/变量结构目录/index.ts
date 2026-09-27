/**
 * 把 zod schema 注册给 MVU。
 *
 * ★ 作用有三：
 *   1. 变量初始化时按 schema 补全缺失字段（initvar.yaml 没写全也不会崩）
 *   2. AI 写入的脏数据按 schema 夹紧（如 行动次数 写 -5 会被 clamp 到 0）
 *   3. 前端 store 与 AI 读写走同一套结构
 */
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../../schema';

$(() => {
  registerMvuSchema(Schema);
  console.info('[活侠传] MVU schema 已注册');
});
