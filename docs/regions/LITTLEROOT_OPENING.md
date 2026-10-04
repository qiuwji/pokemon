# 未白镇开场：实现与接手边界

本页记录本轮实现落点和仍需验收的差异，不替代原作提取证据。参考固定为pret/pokeemerald修订`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`，`work/pokeemerald/`只读。新游戏从车内开始；标题博士介绍等完整全作内容不包含在此切片。

## 先找到原作，再找网页代码

| 原作入口 | 网页落点 / 核准内容 |
| --- | --- |
| InsideOfTruck/scripts.inc，src/field_special_scene.c | inside-of-truck.json，opening-scenes.js：移动/停车/卸货/门光、三个箱子的原静态偏移与逐帧颠簸 |
| LittlerootTown/scripts.inc GoInsideWithMom | littleroot-intro.json：男3,10/女12,10落地，向右跳步；门打开后妈妈出现、下移、面对玩家；并行接近门、妈妈隐藏、玩家上移两格，进屋 |
| players_house.inc EnterHouseMovingIn/MomGoSeeRoom | players-house.json：屋内迎门、玩家转向、设置状态4、玩家上移；门格催促不触发离家warp，进入2F设状态5，早回1F送回楼上 |
| players_house.inc WallClock，src/clock.c，src/wallclock.c | players-house.json，time-interface.js，wall-clock-dial.js：取消/确认/只查看；确认后妈妈按男左/女右入房、退出，状态6/roomChecked；再次查看不重播 |
| players_house.inc PetalburgGymReportMale/Female | players-house.json：下楼看电视、采访音乐恢复、妈妈回座位、状态7/邻居目标 |
| rivals_house.inc及男女House地图脚本 | rivals-house.json：邻居妈妈、球交互、男女对手出场/转向分支 |
| LittlerootTown/scripts.inc GiveRunningShoes | running-shoes.json：图鉴后给鞋，获得物品声部与waitSound、妈妈归家后开放run |

机械核对用`python3 tools/story/extract.py extract --profile tools/story/slices/littleroot-opening.json --out /tmp/emerald-opening-evidence --check`，先预演再提取，随后verify。该profile限定12入口，不代表整张地图所有分支都已人工审阅；中文译文与原机节奏仍需审查。

## 本轮关键修复为什么这样写

妈妈迎门摆位在状态3和4保持一致；不能在可见状态切换时把对象重新摆回椅子。`opening-objects.js`不再让所有剧情旗标组成每个演员的_worldVersion。NPC的scene pin保护正在操纵的同一对象，避免帧刷新替换它。

搬家角色按地图原生local ID绑定，隐式local ID是来源对象序号，不是坐标。男女地图两只过动猿的序号顺序不同；CarryingBox复用水平移动，FacingAway复用原地步行动画，不使用普通宝可梦单帧图。

卡车采用原作48×48精灵和来源位置；首次进入家后条件隐藏，后来出门看不到卡车。妈妈在门打开后才出现；开关门使用原作逐帧图块900–905的visit视觉覆盖，通行块、碰撞、warp不改。再次访问恢复原图块。

FieldSession落在出口门格后，先允许坐标剧情接管，再传送。这里只定义时序扩展点，具体“未调钟不能离家”写在地区数据。FieldDirector等待注入时钟的移动截止点，处理小数时间和浏览器定时器提前返回，避免动画尚未结束就开始下一步。

时钟页面不直接写存档；只持有本次screen提供的提交回调，关闭后失效。表盘使用原作240×160 tilemap和针素材，两根针；页面淡入淡出与规则提交分离。左右/上下、触屏按钮和拖动共用编辑器，确认/取消返回明确结果。

## 导入资源

```sh
python3 tools/import.py movement --profile tools/imports/config/opening.json --actors VigorothCarryingBox VigorothFacingAway Truck --check
python3 tools/import.py opening-art --check
```

检查预演后去掉--check。重新生成general-petalburg的grid图集后必须重跑opening-art；该后处理只拥有指定图集与wallclock输出。`assets/opening-art-source.json`记录固定来源、哈希和门图块；脚本同时支持重复运行，不依赖被忽略的临时work脚本。男女地图/跑步/骑车/冲浪资源仍由opening profile的原有导入流程维护。

## 验证状态与待验清单

代码测试：男女车内→门口逐格→屋内→取消/确认钟→妈妈退出→电视→邻居→鞋；迎门坐标保持、门格拦截、原地步行帧、提前计时器/NPC刷新、存档恢复、声部结束清理均有断言。存档开发版本15，不兼容旧开发档。全量数字及输入证据只维护在[STATUS](../project/STATUS.md)和[本轮记录](../validation/2026-10-05-opening-code/manifest.json)。

**本轮不操作浏览器，端到端交给用户；不得把下面的画面和听音判为已通过。** 建议依次检查：

1. 新游戏下车能看到卡车；妈妈在开门后出现，下移时门关闭，进入家后下一次出门卡车消失。
2. 迎门完成妈妈留在门旁，无瞬移到椅子；两只过动猿分别搬箱行走/原地动作。
3. 首次上楼前走出口被催回；上楼未调钟再下楼被送回；取消后可再次调查。
4. 调钟显示原作圆表盘，键盘/触屏均能调整；确认后妈妈入房说话再走出楼梯，控制恢复；再次看钟不重复妈妈剧情。
5. 下楼电视、男女邻居、跑步鞋fanfare等待；静音/播放结束均不能锁死；保存刷新后剧情进度、性别和时间一致。

尚有业务保真差异：邻居第一次见面的替代入口、北边小女孩的原作完整拦路路径、跑步鞋六格方向路径仍未逐数组重建；现有邻居与给鞋部分使用项目编排/合法寻路。当前钟控件是原作素材加网页可访问操作，不宣称逐像素复制原作确认菜单。全丰缘、救博士/首战的进一步原作核准属于后续地区业务。不要把这轮开场修复称为全作完成。
