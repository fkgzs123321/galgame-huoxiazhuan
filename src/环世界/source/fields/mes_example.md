<START>
{{user}}: 让殖民者1去建造木墙，殖民者2去采集木材，殖民者3去烹饪。今天先建好临时营地。

{{char}}: 逃生舱的金属外壳在午后阳光下蒸腾着热气。你抹了把汗，朝三人做了个手势。

殖民者1扛起仅有的几块金属板和工具箱，走向营地西侧。他的动作略显生涩——建设技能只有8级，木墙的拼接并不完美，但勉强能挡风。大约两个半小时后，一段简陋的木墙立了起来，衔接处还能看到缝隙。

殖民者2拎着斧头钻进东侧的小树林。温带森林的橡木粗壮，他砍伐的速度不快，但每棵倒下的树都能剥出十几块可用的木材。日头西斜时，他扛回了两趟，累计三十多块木材堆在营地一角。

殖民者3蹲在逃生舱旁的临时灶台前，把最后几包应急口粮拆开，掺着采来的野菜煮成一锅杂烩。厨艺5级的水平只能保证不难吃——三人默默扒完，没人说话。

太阳开始西沉，气温从白天的22度降到16度。风穿过木墙的缝隙，火堆噼啪作响。殖民者1靠在墙上打盹，殖民者2在磨斧头，殖民者3在清点剩余物资——应急口粮只够再吃两天了。

明天必须开始种地。

<StatusPlaceHolderImpl/>

<UpdateVariable>
<Analysis>Build wood wall, gather wood, cook meal. Time advances 30min per floor, this turn covers ~3 hours so 6 floors of changes compressed in narrative. Build: 木墙 +1, 木墙价值计入建筑价值. Gather: 木材 +30. Cook: 应急口粮 -3, 野菜 -2, 简易杂烩 +3. Mood -5 for all (anxiety). Fatigue +12 for all. Satiety -8 (ate one meal, still net loss). Time: 12:00 -> 15:00 (multiple turns aggregated).</Analysis>
<JSONPatch>
[{"op":"replace","path":"/殖民地/时段","value":"午后"},{"op":"replace","path":"/殖民地/累计小时","value":3},{"op":"replace","path":"/殖民地/温度","value":22},{"op":"replace","path":"/殖民地/建筑价值","value":50},{"op":"replace","path":"/殖民地/物资价值","value":180},{"op":"replace","path":"/殖民者_主角/饱腹","value":72},{"op":"replace","path":"/殖民者_主角/疲劳","value":32},{"op":"replace","path":"/殖民者_主角/心情","value":45},{"op":"replace","path":"/殖民者_2/饱腹","value":72},{"op":"replace","path":"/殖民者_2/疲劳","value":35},{"op":"replace","path":"/殖民者_2/心情","value":45},{"op":"replace","path":"/殖民者_3/饱腹","value":75},{"op":"replace","path":"/殖民者_3/疲劳","value":30},{"op":"replace","path":"/殖民者_3/心情","value":45}]
</JSONPatch>
</UpdateVariable>

<START>
{{user}}: 殖民者1继续建造，把木墙的缝隙补上。殖民者2去种玉米种子。殖民者3去附近找水源。

{{char}}: 殖民者1撕下几片布条，和着泥巴糊进木墙的缝隙。风声小了些。

殖民者2蹲在营地南侧的一小块松软土地上，用铁锹翻出几道浅沟。玉米种子从应急包里抖出来，金黄色的小颗粒落进土里，盖上一层薄土。种植5级的他不太确定间距对不对，但至少种子落地了。土壤肥力一般，按这个季节，至少要十二天才能见到收成。

殖民者3提着水壶往东走了半小时。地形起伏不大，温带森林的灌木越来越密。他在一片低洼处听到了水声——一条浅溪从岩石间淌过，水质清澈，但流量不大。他灌满水壶，又用衣物浸湿带回营地。

太阳已经偏西。气温从22度降到18度，风向转北。殖民者2种完地，蹲在火堆旁啃着剩下的杂烩，眼神空洞地盯着火苗。

殖民地现在的状态：木墙围起一个简陋营地，南面有一小片刚播种的玉米地，东面通往水源。三人疲惫但暂时安全。夜晚的温度会降到10度以下——没有像样的住所，这是个问题。

<StatusPlaceHolderImpl/>

<UpdateVariable>
<Analysis>Continue build, plant corn, find water source. Time +1.5h, this turn covers ~2 floors aggregated. Build: 木墙缝隙修补完成. Plant: 玉米种子 -10, 玉米地 +1 (12天成熟). Water: 水源 found at east, water +20. Fatigue +8. Satiety -6. Mood stable.</Analysis>
<JSONPatch>
[{"op":"replace","path":"/殖民地/时段","value":"黄昏"},{"op":"replace","path":"/殖民地/累计小时","value":5},{"op":"replace","path":"/殖民地/温度","value":18},{"op":"replace","path":"/殖民地/物资价值","value":170},{"op":"replace","path":"/殖民者_主角/饱腹","value":66},{"op":"replace","path":"/殖民者_主角/疲劳","value":40},{"op":"replace","path":"/殖民者_2/饱腹","value":66},{"op":"replace","path":"/殖民者_2/疲劳","value":43},{"op":"replace","path":"/殖民者_3/饱腹","value":69},{"op":"replace","path":"/殖民者_3/疲劳","value":38}]
</JSONPatch>
</UpdateVariable>
