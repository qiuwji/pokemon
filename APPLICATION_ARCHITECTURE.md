# 绿宝石应用服务与组合入口

`dist/packs/emerald/adventure.js` 保留 EmeraldAdventure 兼容门面：内容配置、UI 挂接、忙碌状态聚合、会话重绑顺序和公开方法转发。原 1,526 行中的用例逻辑移至 `application/`。公开调用路径和返回值保持；本次不机械改写 UI、命令或插件为另一套入口。

## 职责与状态所有权

| 服务 | 职责 | 自己持有的会话对象/状态 |
| --- | --- | --- |
| save | 默认进度、加载/导入/导出/重开、保存保护、随机数重绑 | state、rng、SaveStore、保存时间与保护信息 |
| time | 世界 RTC、实际游玩时长、时间边界与持久任务协调 | WorldClock、WorldSchedule |
| actors | 持续身份、感知导航、角色命令与 NPC 投影协调 | ActorRepository、有限 runtime 端口 |
| crops | 树果生命周期、种植/浇水/采摘的库存提交 | CropRegistry、CropService |
| party | 图鉴登记、初始精灵领取、管理资格、学习招式协调 | 无复制状态 |
| inventory | 背包、商店资格/购买、装备、队伍排序与仓库出入 | ItemService、EquipmentService、PartyStorageService |
| forms | 野外形态操作与保存记录绑定 | CreatureForms |
| growth | 进化、寄养、领取/孵化、交换及相关演出 | GrowthSession、GrowthDirector、TradeService、育成锁 |
| battle | 训练家/野生战斗创建、行动协调、结果与奖励剧情 | BattleSession |
| story | 剧情指令端口、静态验证、输入锁、执行与失败收尾 | CommandRunner、剧情锁 |
| world | 地图/动态世界绑定、永久/访问覆盖与入口恢复预检、碰撞保护、行走与对象交互 | WorldStateService、FieldSession、FieldDirector |
| fieldActions | 野外资格/目标、操作预检、演出与世界提交、钓鱼会话协调 | FieldActionService、FieldActionDirector、FishingSession、actionBusy |
| movement | 移动资格、交通模式、冲浪与飞行协调、访问目的地 | MovementService、TravelService、TravelDirector |
| triggers | 步进时钟、剧情/训练家视线/遭遇优先级 | 遭遇间隔记录 |
| frame | 每帧的领域更新与 NPC 暂停/育成提醒协调 | 无复制状态 |
| inspection | 将会话和地图投影成诊断视图 | 无领域规则 |
| presentation | 校验演出资格并调用演出端口 | 无领域规则 |

它们是本内容包的应用层，协调通用 `engine/` 领域服务；战斗公式、库存不变量、进化规则和碰撞规则继续由引擎负责。新增内容/插件仍使用已公开注册与命令，不直接导入这些内部服务。

## 显式、实时的依赖端口

每个服务导出自己的 `*_PORTS` 合同，只接收列出的依赖，不接收整个 EmeraldAdventure，也不直接导入其他应用服务。`ports.js` 校验缺失/多余依赖，拒绝可写端口。跨服务调用由 `composition.js` 和门面连接，服务内部无法凭一个 `game` 引用遍历所有模块。

端口使用实时 getter：读档会替换 state、rng 和领域会话，服务每次读取取得当前所有者的对象，避免闭包抓住旧存档。依赖属性不可被服务替换；领域对象本身仍由可信应用用例协调修改，这是共享身份的既定设计，不能误称深度只读或安全沙箱。插件边界仍由只读查询、权限与命令事务保护。

`compatibility.js` 明确列出既有字段的所有者，旧 `game.state`、`game.growth`、`game.combat` 等只转发至一个服务；没有两份状态需要同步。既有宿主使用的 storyBusy 写入也转发到剧情服务。以后是否收窄旧外观是独立版本/API 决策，本次不引入破坏性改名。

## 重载生命周期

加载/重开先更换保存服务的 state，再由 bindField 依次重绑 RNG → 形态 → 育成 → 时间 → 树果 → Actor → 世界。世界绑定动态覆盖后，显式调用移动服务重绑，再创建 FieldSession 与导演并重绑野外行动服务，最后重绑插件。浏览器/UI 生命周期由宿主继续驱动；这些服务不读取 DOM 或 localStorage。

## 继续开发约束

新用例放入拥有该领域的服务；跨域用例声明所需命令/查询端口。不要在 adventure.js 增加招式结算、库存写入、剧情分支或大型指令表；不要把整个门面转交给新服务。只有真实新增共享职责才扩展公共引擎合同。

验证记录见 DEVELOPMENT_LOG.md。application-services.test.js 守卫门面职责与文件规模、单一状态所有者、读档后的实时依赖、依赖不可拓宽/覆盖以及应用服务的导入方向。各领域组合回归不每次重复，修改涉及它们的合同或生命周期时再失效重查。

地图访问生命周期见 docs/engine/WORLD_LIFECYCLE.md。门/相邻地图/飞行/野外行动/剧情共用入口；TravelService 通过受控 enter 端口提交，不再提前修改玩家位置。读取存档恢复当前访问，不清除当前临时状态。
