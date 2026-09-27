const abilityScore = (v: unknown, def: number) => {
  if (typeof v === 'number' && Number.isFinite(v)) return _.clamp(Math.round(v), 0, 10);
  if (v === '低') return 2;
  if (v === '中') return 5;
  if (v === '高') return 8;
  return def;
};

const abilityField = (def: number) =>
  z
    .union([z.coerce.number(), z.enum(['低', '中', '高'])])
    .transform(v => abilityScore(v, def))
    .prefault(def);

export const Schema = z.object({
  剧情: z
    .object({
      当前章节: z
        .enum([
          '序章',
          '第一章',
          '第二章',
          '第三章',
          '第四章',
          '第五章',
          '第六章扶桑',
          '第六章至暗',
          '第七章丛林',
          '第七章大风',
          '第八章美丽',
          '第八章规则',
          '第九章',
          '第十章',
          '终章',
        ])
        .prefault('序章'),
      /** 章内节点序号（辅助） */
      章节进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 999)).prefault(0),
      /** 精确节点 ID，与《抉择校验表》一致，如 序章-1 */
      当前节点: z.string().prefault('序章-1'),
      序章已完成: z.boolean().prefault(false),
      主线归属: z.enum(['', '扶桑安魂曲', '美丽世界', '红色芳华']).prefault(''),
      第二章分歧: z.enum(['', '共荣圈', '自保']).prefault(''),
      第五章分歧: z.enum(['', '刺杀浅野', '继续潜伏']).prefault(''),
      结局分支: z.string().prefault(''),
      已死亡: z.boolean().prefault(false),
      检查点: z.string().prefault('序章-1'),
      已触发事件: z.array(z.string()).prefault([]),
      已收集线索: z.array(z.string()).prefault([]),
      已解锁死亡结局: z.array(z.string()).prefault([]),
    })
    .prefault({}),

  肖途: z
    .object({
      伪装完整度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(72),
      身心状态: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(80),
      公馆资历: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(5),
      组织信任度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(67),
      阵营信用: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(55),
      /** 八维能力 0~10，与《角色能力矩阵》肖途基线一致，init 后禁止 AI 擅自改分 */
      能力: z
        .object({
          社交伪装: abilityField(8),
          情报分析: abilityField(5),
          审讯抗性: abilityField(5),
          枪械: abilityField(2),
          格斗: abilityField(2),
          潜行规避: abilityField(5),
          权衡狠决: abilityField(6),
        })
        .prefault({}),
    })
    .prefault({}),

  敌方: z
    .object({
      武藤志雄怀疑度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 10)).prefault(3),
    })
    .prefault({}),

  组织: z
    .object({
      联络状态: z.enum(['正常', '中断', '暴露']).prefault('正常'),
      当前任务: z.string().prefault(''),
    })
    .prefault({}),

  对user: z
    .object({
      方敏: z
        .object({
          情感值: z.coerce.number().transform(v => _.clamp(Math.round(v), -20, 20)).prefault(0),
          信任度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40),
        })
        .prefault({}),
      庄晓曼: z
        .object({
          情感值: z.coerce.number().transform(v => _.clamp(Math.round(v), -20, 20)).prefault(0),
          互信度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),
        })
        .prefault({}),
      武藤纯子: z
        .object({
          情感值: z.coerce.number().transform(v => _.clamp(Math.round(v), -20, 20)).prefault(0),
          信任度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40),
        })
        .prefault({}),
      陆望舒: z
        .object({
          情感值: z.coerce.number().transform(v => _.clamp(Math.round(v), -20, 20)).prefault(0),
          信任度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
        })
        .prefault({}),
    })
    .prefault({}),
}).transform(data => {
  const ab = data.肖途.能力;
  const C = data.肖途.伪装完整度;
  const S = data.肖途.身心状态;
  const D = data.敌方.武藤志雄怀疑度;
  const minSC = Math.min(S, C);

  const $肖途社交有效 = Math.floor((ab.社交伪装 * C) / 100);
  const $肖途情报有效 = Math.floor((ab.情报分析 * minSC) / 100);
  const $肖途审讯有效 = Math.floor((ab.审讯抗性 * S) / 100);
  const $肖途枪械有效 = Math.floor((ab.枪械 * S) / 100);
  const $肖途格斗有效 = Math.floor((ab.格斗 * S) / 100);
  const $肖途潜行有效 = Math.floor((ab.潜行规避 * minSC) / 100);
  const $肖途狠决有效 = Math.floor((ab.权衡狠决 * S) / 100);

  let $暴露风险: '低' | '中' | '高' | '临界' = '低';
  if (D >= 9 || C <= 15) $暴露风险 = '临界';
  else if (D >= 7 || C <= 30) $暴露风险 = '高';
  else if (D >= 5 || C <= 50) $暴露风险 = '中';

  let $允许行动级别 = 1;
  if ($暴露风险 === '临界') $允许行动级别 = 1;
  else if ($暴露风险 === '高') $允许行动级别 = S >= 30 ? 2 : 1;
  else if ($暴露风险 === '中') $允许行动级别 = S >= 40 ? 3 : 2;
  else $允许行动级别 = S >= 50 ? 4 : 3;

  const $可请求组织支援 = data.肖途.组织信任度 >= 60 && data.组织.联络状态 === '正常';
  const $可套取日方核心情报 = D <= 4 && data.肖途.阵营信用 >= 50;
  const $方敏可交底 = data.对user.方敏.信任度 >= 70;
  const $庄晓曼可协同高危任务 =
    data.对user.庄晓曼.互信度 >= 65 && data.对user.庄晓曼.情感值 >= 5;

  const node = data.剧情.当前节点;
  const $序章节点名 =
    node === '序章-0'
      ? '开场'
      : node === '序章-1'
        ? '方汉洲质问'
        : node === '序章-2'
          ? '方敏追问'
          : node === '序章-3'
            ? '去向选择'
            : node === '序章-4'
              ? '图书馆等待'
              : node === '序章-5'
                ? '秘密基地'
                : node === '序章-6'
                  ? '序章完成'
                  : '未知';

  return {
    ...data,
    $肖途社交有效,
    $肖途情报有效,
    $肖途审讯有效,
    $肖途枪械有效,
    $肖途格斗有效,
    $肖途潜行有效,
    $肖途狠决有效,
    $暴露风险,
    $允许行动级别,
    $可请求组织支援,
    $可套取日方核心情报,
    $方敏可交底,
    $庄晓曼可协同高危任务,
    $序章节点名,
  };
});

export type Schema = z.output<typeof Schema>;
