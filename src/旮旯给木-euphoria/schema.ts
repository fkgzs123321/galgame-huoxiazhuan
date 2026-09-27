// ════════════════════════════════════════════════════════════
// 旮旯给木 · MVU schema.ts
// 变量结构的唯一权威定义，与 创作规划.yaml 的 mvu.structure / mvu.variables 严格对应
//
// 遵循 references/mvu/zod-rule.yaml（Zod 4）：
//   - 顶部禁止任何 import（z 与 _ 由 forge 通过 jiti 全局注入）
//   - 统一用 z.prefault() 而非 z.default()，保证增量更新与「可清空对象」都能解析
//   - 数值一律 z.coerce.number() + _.clamp + Math.round：越界值夹紧，而不是整块更新被丢弃
//   - 数组类语义改用 z.record（键 = 可读标识），避免下标难以维护
//   - 动态键统一 z.record(z.string().describe(键含义), z.object({...}).prefault({}))
//
// 三层世界（模块化架构）：
//   引擎层 → 主角 / 她 / 终局（换底座时一行不动）
//   底座包 → 世界.底座 / 世界.当前关卡 / 世界.关卡进度 / 世界.场景 / 世界.女角
// ════════════════════════════════════════════════════════════

export const Schema = z.object({
  // ─── 主角：仅有的一笔可消耗资源与两本账 ───
  主角: z.object({
    // 拒绝选项的燃料。离线自主行动缓慢累积；在线被逼做屈辱之事剧烈累积；
    // 拒绝选项按等级扣点（微 3-5 / 中 10-15 / 强 25-35 / 极 50+），反抗失败照样扣。
    // 耗尽进入「深度顺从」，不显示拒绝按钮，随离线时间缓慢回充。
    反抗值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50).describe(
      '拒绝选项的燃料，0~100。耗尽即进入深度顺从（不再显示拒绝按钮），随离线时间缓慢回充',
    ),
    // 离线自由的时间代价，也在终局充当「最后一次自由」的倒计时。
    体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe(
      '离线自由的时间代价，0~100。离线态随时间扣减，暂停态不扣；睡眠、进食、静止可恢复；归零即冻结态',
    ),
    // 四态循环：决定这一层你能做什么（只有拒绝 / 什么都做不了 / 自由行动）。
    状态: z.enum(['在线', '暂停', '离线', '冻结']).prefault('在线').describe(
      '当前所处状态：在线（她正在玩，你只能花反抗值拒绝）｜暂停（世界静止，体力不扣）｜离线（完全自主，体力流逝，可改好感度、留痕迹、累积对她的了解）｜冻结（体力归零，意识封存，直到她再次上线）',
    ),
    // 决定「她的倾向暗示」的清晰度，也是终局「越界一次」的门槛（需 ≥80）。
    对她的了解: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe(
      '0~100，靠通过摄像头观察她累积。0-20 只知道她在犹豫；21-50 能看出她中意哪一类；51-80 能看出她盯着哪个选项；81+ 能确定她会点哪个。「越界一次」终局需 ≥80',
    ),
    // 离线态的一切行动都会留下记录；她上线时按熟练度扫描，与她的注意力比较。
    痕迹: z.record(
      z.string().describe('痕迹标识（一句话概括这次离线行为，如「撬开储物柜」）'),
      z.object({
        内容: z.coerce.string().prefault('').describe('痕迹的具体表现：你留下了什么、哪里对不上'),
        明显度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(30).describe(
          '痕迹的明显程度，0~100。她上线扫描时与她的注意力比较，超过即被发现',
        ),
        是否被发现: z.boolean().prefault(false).describe(
          '是否已被她发现；被发现即触发惩罚，形式随她的人设而定（她只当作游戏出了异常，不会说破）',
        ),
      }).prefault({}),
    ).prefault({}).describe('离线行为留下的记录；她上线时按熟练度扫描（沉浸期最细、收官期最疏）'),
    // 每次反抗被她当成一个「故障」记下来，之后她点选项会主动绕开。
    已知软肋: z.record(
      z.string().describe('软肋名（她已摸清的东西，如「怕黑」「在意梨香」）'),
      z.object({
        来源: z.coerce.string().prefault('').describe('她是怎么摸清的：哪一次反抗被她当成了故障'),
        绕开方式: z.coerce.string().prefault('').describe('她后续点选项时会如何绕过它'),
      }).prefault({}),
    ).prefault({}).describe('她已摸清并在后续选项中主动绕开的软肋；清单越长，你越难反抗'),
    // 离线态里 <user> 自己找到、拿到的东西
    身上: z.record(
      z.string().describe('东西的名字（如「半截钥匙」「美工刀」「一支笔」）'),
      z.object({
        哪来的: z.coerce.string().prefault('').describe('在哪拿到的（储物柜 / 洗面台 / 装置旁边 / 地上）'),
        有什么用: z.coerce.string().prefault('').describe('这东西能拿来做什么。<user> 未必已经知道，知道多少写多少'),
        她知不知道你拿了: z.boolean().prefault(false).describe('她上线时有没有从摄像头里看见你拿'),
      }).prefault({}),
    ).prefault({}).describe('<user> 在离线态拿到的东西。拿到的每一样都要写清哪来的、能做什么、她知不知道'),
    已知线索: z.record(
      z.string().describe('线索的名字（如「凹槽上的刻字」「叶的袖口」）'),
      z.object({
        在哪发现: z.coerce.string().prefault('').describe('在哪、什么时候发现的'),
        说明什么: z.coerce.string().prefault('').describe('这条线索指向什么。<user> 理解到哪一层就写到哪一层，不要写成上帝视角'),
        真相深度: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 4)).prefault(1).describe('1=密室本身 2=人造的 3=乐园计划 4=台上台下是一体。对应「乐园计划」里的四层'),
      }).prefault({}),
    ).prefault({}).describe('<user> 自己查出来的线索。累积够了才能推断出更深的真相层；不许直接给结论'),
    // 每一次成功拒绝都有永久代价：被她放弃的那种玩法，之后不会再出现
    已封死的路: z.record(
      z.string().describe('被拒掉的选项种类（如「对人动手」「当众」）'),
      z.object({
        什么时候: z.coerce.string().prefault('').describe('在第几层拒的、当时的情境'),
        代价: z.coerce.string().prefault('').describe('这条路封死之后 <user> 失去了什么'),
      }).prefault({}),
    ).prefault({}).describe('被 <user> 拒掉、之后永远不会再出现的选项种类。每拒成功一次就多一条，这张清单只会变长'),
    // ─── 身体账单：唯一属于你、却全由她造成的东西 ───
    // 它不在你的掌控里，只会一直涨。玩家盯着它看，比读任何描写都难受。
    身体: z.object({
      忍耐度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe(
        '0~100，每层的即时承受力。她继续往下点就会扣，扣到 0 当层就交代（射精／失禁／崩溃，随场景定）。事后回升，但上限会随「敏感度」下降',
      ),
      累计次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0).describe(
        '被用了多少次。只增不减，没有上限，数字本身没有意义，但它一直在涨',
      ),
      实感: z.coerce.string().prefault('').describe(
        '这一层 <user> 身上的感觉，用身体的话写，不要报数字（如「撑得住，但手已经在抖」「腰已经开始发软，你自己没察觉」）。它比「忍耐度」那个数字更接近真话',
      ),
      敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe(
        '0~100，被改写的程度。越高，同样刺激下的反应越剧烈、忍耐度上限越低。这是「你的身体正在被她改变」最直接的证据。它涨得慢、落得也慢，但会回落',
      ),
      身体痕迹: z.record(
        z.string().describe('痕迹名（留在身体或场景上的，如「左肩的指印」）'),
        z.object({
          来源: z.coerce.string().prefault('').describe('哪一次留下来的，是她的选择还是你反抗的代价'),
          是否消退: z.boolean().prefault(false).describe('是否已经消退；未消退的会一直在'),
        }).prefault({}),
      ).prefault({}).describe('留在这具身体和这个场景上的东西；和「痕迹」不同，这些是她造成的，不是你做的'),
    }).prefault({}),

    // 和「身体痕迹」的区别：那些会淡，这些不会。写进去就不能撤回。
    不可逆损伤: z.record(
      z.string().describe('损伤名（如「右腕的旧伤」「左耳听不清了」）'),
      z.object({
        来源: z.coerce.string().prefault('').describe('哪一次留下来的，写清是她的哪个选择'),
        影响: z.coerce.string().prefault('').describe('它现在还在怎么影响 <user>：能做到什么、做不到什么'),
        第几关: z.coerce.string().prefault('').describe('发生在第几关或第几层'),
      }).prefault({}),
    ).prefault({}).describe('留在这具身体上、永远不会消退的东西。和「身体痕迹」的区别是：那些会淡，这些不会。一旦写进去就不能撤回，也不许写「后来好了」'),
    // LCG 伪随机的种子：由脚本读写，AI 既看不到也不更新。
    '$骰子种子': z.coerce.number().prefault(20260914).describe(
      'LCG 伪随机的种子（脚本读写，AI 不可见）。每次投掷后更新，保证同一回合重新渲染得到同一个结果',
    ),
  }).prefault({}),

  // ─── 她：屏幕外的玩家，操控你、你看得见她（她不知道） ───
  她: z.object({
    // 7 套人设之一，开局启动。她换了底座等于换一个游戏玩，人不变。
    人设: z.enum([
      'gentle', 'greedy', 'smirking', 'daredevil', 'quiet', 'indifferent',
      'completionist', 'feverish',
    ]).prefault('gentle').describe(
      '屏幕外玩家的人设 id，8 套之一：gentle=温砚(温柔)｜greedy=丰娆(贪心)｜smirking=舒晏(施虐)｜daredevil=唐响(极端)｜quiet=沈眠(死亡)｜indifferent=莫漾(淡漠)｜completionist=纪清(全收集)｜feverish=郁燃(自己要)。决定她的选项倾向、自慰形式与结局走向',
    ),
    // 熟练度同时管三件事：上线时长与间隔、痕迹扫描强度、反抗成功率惩罚。
    熟练度: z.enum(['新手', '上手', '沉浸', '狂热', '收官']).prefault('新手').describe(
      '她的上手程度：新手→上手→沉浸→狂热→收官。决定上线时长与间隔、痕迹扫描强度，并给反抗成功率带来 0 / 0.1 / 0.2 / 0.3 / 0.4 的惩罚',
    ),
    // 无 UI 提示，但决定她点选项的激进程度，以及她漏不漏掉异常。
    兴奋度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe(
      '0~100，无 UI 提示。由剧情节点确定性驱动（非随机）：高时选项激进、注意不到异常、反抗成功率上升；达 80 她会跳出选项自由打字；高潮后进入贤者时间，选项变温和但痕迹扫描加强',
    ),
    情绪: z.enum(['好奇', '投入', '执念', '厌倦']).prefault('好奇').describe(
      '好奇｜投入｜执念｜厌倦。决定人设漂移与选项倾向，由「目的进度停滞 + 反抗次数」共同触发漂移',
    ),
    // 与关卡进度互不影响：她完全可能在游戏没通关时达成目的然后退场。
    // 没有统一公式——推不推进，由她这一套人设「想要什么」决定，逐条见角色条目的「诉求」段。
    目的进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe(
      '0~100，她这一次玩想要的东西达成到哪一步。推进条件与反抗的效果都由她的 7 套人设各自定义（见角色条目的「诉求」段）：有的跟关卡同步，有的只看你痛不痛，有的压根不涨。她达成自己想要的东西之后就退场、触发终局，你的世界会在中间戛然而止',
    ),
    刚才说的: z.coerce.string().prefault('').describe(
      '她刚才对着屏幕说的那一句原话，一个字都不要改。这是 <user> 唯一能直接听见她的时候。写成人话，像她在跟屏幕说话，或者自言自语。不要写成旁白，不要加引号以外的修饰。没有就说没说话时留空',
    ),
    此刻: z.coerce.string().prefault('').describe(
      '<user> 隔着摄像头看得见的她：一句话说她此刻在做什么。离线时留空，暂停时写她停手的样子',
    ),
    // 她这一侧 NSFW 的主展示位。<user> 只能看见，不能碰。
    身体: z.object({
      姿势: z.coerce.string().prefault('').describe('她怎么坐、腿怎么放（如「缩在椅子里，一条腿盘上来」「整个人往后靠，膝盖张开了」）。椅子、床、地板上都一样写'),
      衣物: z.coerce.string().prefault('').describe('她身上此刻是什么状态（如「睡袍带子松开一边，肩露出来了」「上衣已经被撩到胸口上面」）。写到 <user> 看得见的程度'),
      动作: z.coerce.string().prefault('').describe('她的手在哪、在做什么，写到看得见的程度（如「一只手还按在鼠标上，另一只不在画面里」「手在腿间，隔着布料，没动」「手指停住了，停在半路」）'),
      呼吸: z.coerce.string().prefault('').describe('她的呼吸和声音（如「呼吸比刚才快，肩膀在起伏」「刚才那一口咽口水 <user> 听见了」「咬着嘴唇没出声」）'),
      留下: z.coerce.string().prefault('').describe('她那边的痕迹（如「桌上多了几张抽出来的纸巾」「靠垫上有一小块深色」）。会被下一层看见'),
    }).prefault({}),
    游玩时长: z.coerce.string().prefault('0 小时').describe(
      '显示用字符串：她屏幕边缘写着你被玩了多少小时，如「12 小时」',
    ),
  }).prefault({}),

  // ─── 世界：全部用通用容器，换底座时结构一行不动 ───
  世界: z.object({
    // 换底座的操作就是改这一个值 + 放入对应底座包 → EJS 自动路由 → 新游戏。
    底座: z.enum(['euphoria']).or(z.string()).prefault('euphoria').describe(
      '当前生效的底座包 id，已实装 euphoria。改成别的 id 即路由到另一套世界观/女角/关卡（须同时放入对应底座包），等于换一个游戏',
    ),
    当前关卡: z.coerce.string().prefault('第一关·监视器装置房').describe(
      '当前关卡标识，由底座包定义；底座定义的关卡全部完成即逃出',
    ),
    关卡倒计时: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0).describe(
      '这一关还剩几层。归零即处刑。和「她的上线时长」是两条独立的时间线，各算各的',
    ),
    关卡进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe(
      '0~100，当前关卡内的推进度；满则解锁下一关、一扇通向外面的门',
    ),
    场景: z.coerce.string().prefault('中央大厅').describe(
      '当前所在场景，由底座包定义（纯白密室：中央大厅、监视器装置房、玻璃房、洗手间、储物间、天台）',
    ),
    // 动态键：换底座即整批换角色，故不写死任何角色名。
    当前线: z.enum(['未定', '梨香', '菜月', '凛音', '合欢', '叶', '鬼畜']).prefault('未定').describe(
      '这一局正在往哪条线走。未定 = 还没分线（前两关）。分线看谁的好感度最高，加上她偏好谁。走到哪条线，那条线的剧情场面才会被调出来',
    ),
    篇章: z.enum(['密室', '学园', '记忆']).prefault('密室').describe(
      '现在在哪一段。密室 = 五扇门的游戏；学园 = 出密室之后的后果；记忆 = 地下与真相。只有叶线走到底才会进后两段',
    ),
    女角: z.record(
      z.string().describe('角色名（游戏内女角的名字，如「莳羽梨香」）'),
      z.object({
        好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0).describe(
          '她对你的态度，-100~+100。正数是正向（越爱越深），负数是反向（越恨越深），0 是陌生。九档：+81~+100 沉溺｜+56~+80 依附｜+31~+55 动摇｜+11~+30 软化｜-10~+10 陌生｜-11~-30 戒备｜-31~-55 敌意｜-56~-80 憎恨｜-81~-100 崩坏。离线态你对女角做的事写这里，它反过来决定她下次上线时按哪一段演、以及选项列表',
        ),
        状态: z.coerce.string().prefault('').describe('她此刻的处境，自由描述（如「被绑在装置上」「昏迷」「跟在主角身后」）'),
        身体记忆: z.coerce.string().prefault('').describe(
          '她的身体记住了什么（如「被你碰过的地方会先抖一下」）。这是她已经改不掉的部分，与「好感度」无关',
        ),
        // 三处：每处单独记「做到哪一步」与「现在什么样」
        胸: z.object({
          开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('0~100，这里被做到哪一步'),
          现状: z.coerce.string().prefault('').describe('这里此刻的状态（如「隔着衬衫也能看出立起来」「被人从背后握着」），没有特别状态时留空'),
        }).prefault({}),
        阴部: z.object({
          开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('0~100，这里被做到哪一步'),
          现状: z.coerce.string().prefault('').describe('这里此刻的状态（如「已经湿了，她自己还没承认」「还在疼」，没有特别状态时留空'),
          破瓜: z.boolean().prefault(false).describe('是否已经不再是处女；一旦是 true 就不再变回'),
        }).prefault({}),
        后穴: z.object({
          开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('0~100，这里被做到哪一步；通常涨得最慢'),
          现状: z.coerce.string().prefault('').describe('这里此刻的状态（如「还紧着，刚才那一下让她整个人绷住了」），没有特别状态时留空'),
        }).prefault({}),
      }).prefault({}),
    ).prefault({}).describe('以角色名为键的动态记录（换底座无需改结构）；每个女角记四件事：好感度、处境、开发度、身体记忆'),
  }).prefault({}),

  // ─── 局面：这一层她摆在桌面上的东西 ───
  局面: z.object({
    // 每层由她出招时写入，供状态栏渲染选项卡；下一层开始时整体替换。
    当前选项: z.record(
      z.string().describe('选项标识（简短，如「A」「B」）'),
      z.object({
        文本: z.coerce.string().prefault('').describe('她看到的选项名，也是你能预判的唯一依据'),
        反抗等级: z.enum(['微', '中', '强', '极', '锁']).prefault('中').describe('微｜中｜强｜极｜锁。锁是剧情锁，拒绝按钮灰掉'),
        反抗消耗: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('拒绝它要花多少反抗值；等级对应 微3-5 / 中10-15 / 强25-35 / 极50+'),
        她的后果: z.coerce.string().prefault('').describe('她选了这个会发生什么，决定你要不要拒绝'),
        你会是什么样: z.coerce.string().prefault('').describe(
          '这一下落到身上会是什么样，写具体的、没被总结的那个细节（如「她会把脸偏过去，但不挣」「指甲会掐进你小臂里」）。写给人看，不要写给人汇报。这一行是给 <user> 看的，也是给他掂量要不要拒的',
        ),
        触发条件: z.coerce.string().prefault('').describe('出现在什么前提下，没有条件时留空'),
      }).prefault({}),
    ).prefault({}).describe('本层浮现的选项，四个；她只会选其中一个'),
    她的倾向: z.coerce.string().prefault('').describe('她的倾向暗示。清晰度由「对她的了解」决定：0-20 只写她在犹豫，21-50 写出她中意哪一类，51-80 写出她盯着哪个，81+ 写出接近确定的结果'),
    她已选: z.coerce.string().prefault('').describe('她最终点了哪个选项的标识；结算后填写，下一层开始时清空'),
    自定义意图: z.coerce.string().prefault('').describe(
      '玩家自己写的一条意图（按自己的意思来）。它不由她摆出来，是硬夺回身体那一下。空着表示没走这一手',
    ),
    玩家拒绝: z.coerce.string().prefault('').describe(
      '玩家这一层拒绝了哪个选项（选项的键）。没拒绝时留空。它由界面的拒绝按钮写入，不是 AI 写的',
    ),
    判定结果: z.object({
      操作: z.coerce.string().prefault('').describe('拒绝 还是 自定义'),
      选项: z.coerce.string().prefault('').describe('被拒绝那条选项的文本'),
      等级: z.coerce.string().prefault('').describe('反抗等级'),
      消耗: z.coerce.number().prefault(0).describe('拒绝它要扣多少反抗值'),
      成功率: z.coerce.number().prefault(0).describe('引擎算出的成功率，百分数'),
      掷值: z.coerce.number().prefault(0).describe('LCG 掷值'),
      结果: z.coerce.string().prefault('').describe('成功／失败'),
      档位: z.coerce.string().prefault('').describe('大成功／成功／勉强成功／失败／大失败'),
      效果倍数: z.coerce.number().prefault(1).describe('该档位对应的效果倍数'),
    }).prefault({}).describe('引擎算好的判定结果。AI 只读不写，结算完清空'),
    误点: z.boolean().prefault(false).describe(
      '她这一层是不是点了她本来不想点的那个。她手滑了。按熟练度给概率：新手 15%、上手 10%、沉浸 6%、狂热 3%、收官 8%。误点之后她会愣一下，可能自言自语，也可能想撤回',
    ),
    她打的字: z.coerce.string().prefault('').describe(
      '兴奋度到 80 以上时，她不再从选项里挑，而是直接对着屏幕打字。这里放她打的那句话本身。没有自由打字时留空',
    ),
    // 这一层游戏世界里正在发生的事，也是这一层 NSFW 的主展示位。
    // 规则：写身体，不写概括。让看的人有反应，不是让看的人知道。
    场面: z.object({
      地点: z.coerce.string().prefault('').describe('此刻在哪（沿用世界.场景里的说法）'),
      体位: z.coerce.string().prefault('').describe('此刻是什么姿势、谁在什么位置（如「站着，从背后」「按在玻璃上，脸朝镜子」「跪在地上，手腕被压住」）。写具体的，不写「在做那种事」'),
      节奏: z.coerce.string().prefault('').describe('此刻的节奏与动静（如「很慢，每一下都停半拍」「突然快起来，她自己没料到」「停下来喘」）。节奏比动作更色'),
      参与: z.record(
        z.string().describe('参与或在场的人名'),
        z.object({
          在内: z.boolean().prefault(false).describe('true = 正在被做的那一个；false = 只在旁边看'),
          胸: z.coerce.string().prefault('').describe('她胸口此刻的样子。写具体的：衣服的状态、乳尖、有没有被碰到、她怎么挡（如「隔着校服顶起来两点，她用胳膊挡着，挡不住」）'),
          阴部: z.coerce.string().prefault('').describe('她那里此刻的样子。写具体的：干湿、衣物的状态、有没有进去过、有没有反应（如「湿到腿上了，她自己还没承认」）'),
          后穴: z.coerce.string().prefault('').describe('她那里此刻的样子（如「还紧着，没碰过」「被手指撑开了，一直在抖」）'),
          反应: z.coerce.string().prefault('').describe('她身上正在发生的、看得见的反应（如「膝盖在抖，站不太住」「声音卡在喉咙里」「捂着嘴不敢出声」）'),
        }).prefault({}),
      ).prefault({}).describe('这一层所有人此刻的身体状态。被做的写详细，旁观的控制在一句话'),
      留痕: z.coerce.string().prefault('').describe('场面上真实留下的东西（如「玻璃上一只手印」「地上一小片湿的」），会被下一层的人看见'),
      她看到的: z.coerce.string().prefault('').describe('她隔着屏幕看到这一幕时的反应（如「她把音量调小了」）。只写 <user> 能听见或看见的，没有就留空'),
    }).prefault({}),
  }).prefault({}),

  // ─── 终局：她的目的达成 → 她关掉游戏 → 最后一次自由 ───
  终局: z.object({
    已触发: z.boolean().prefault(false).describe(
      '她的目的进度满值、她关掉游戏后置为 true；世界停止推进、所有女角停在原地、她的画面与声音一起消失',
    ),
    剩余体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe(
      '0~100，最后一次自由的倒计时。未触发时为 0；触发时回满为 100 并随你做的事递减，归零就真的结束',
    ),
    选择: z.enum(['last_person', 'last_record', 'destroy_all', 'gaze', 'cross_line']).nullable().prefault(null).describe(
      '终局五选一，null 表示尚未选择：last_person=最后一个人｜last_record=写给不会读的人｜destroy_all=砸不掉的东西｜gaze=凝视｜cross_line=故障不可能是爱（越界一次，需「对她的了解」≥80）',
    ),
  }).prefault({}),
}).prefault({});

export type Schema = z.output<typeof Schema>;
