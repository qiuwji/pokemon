# 绿宝石应用服务与组合入口

`dist/packs/emerald/adventure.js` 是 EmeraldAdventure 组合入口：内容配置、UI 挂接、忙碌状态聚合和会话重绑顺序。0.15.0时将逐方法转发改为 `application/public-ports.js` 的显式所有权表，入口转发收口时 382→136 行，当前0.21.0经显式外观/视口接线为151行；用例由 25 个应用服务拥有。新能力登记端口，不在入口追加转发方法。

## 职责与状态所有权

| 服务 | 职责 | 自己持有的会话对象/状态 |
| --- | --- | --- |
| save | 默认进度、加载/导入/导出/重开、保存保护、随机数重绑 | state、rng、SaveStore、保存时间与保护信息 |
| encounters | 遇敌渠道、有效表/候选、关联Actor的唯一野生个体凭证、直接战斗结果 | EncounterPolicyRegistry、EncounterTickets、暗雷冷却 |
| contacts | 稳定实体接触、去重、输入/帧边界发布与读取 | FieldContacts，无持久副本 |
| weather | 世界天气生命周期、地图/时间/命令/剧情协调与事实 | WorldWeather、WeatherRegistry |
| time | 世界 RTC、实际游玩时长、时间边界与持久任务协调 | WorldClock、WorldSchedule |
| actors | 持续身份、感知导航、角色命令与 NPC 投影协调 | ActorRepository、有限 runtime 端口 |
| devices | 格子机关、局部延迟任务与领域行动请求协调 | FieldDeviceCatalog、FieldDevices、执行锁 |
| crops | 树果生命周期、种植/浇水/采摘的库存提交 | CropRegistry、CropService |
| party | 图鉴登记、初始精灵领取、管理资格、注册学习方式/机器/手动学习协调 | MoveLearningService，无复制持久状态 |
| itemShortcut | 登记/取消/快捷使用、锁与保存边界 | ItemShortcutService，registeredItem 的写入用例 |
| inventory | 背包、商店资格/购买、装备、队伍排序与仓库出入 | InventoryService、ItemService、EquipmentService、PartyStorageService |
| forms | 野外形态操作与保存记录绑定 | CreatureForms |
| growth | 进化、寄养、领取/孵化、交换及相关演出 | GrowthSession、GrowthDirector、TradeService、育成锁 |
| battle | 训练家/野生战斗创建、行动协调、结果与奖励剧情 | BattleSession |
| story | 剧情指令端口、静态验证、输入锁、执行与失败收尾 | CommandRunner、剧情锁 |
| world | 地图/动态世界绑定、永久/访问覆盖与入口恢复预检、碰撞保护、行走与对象交互 | WorldStateService、FieldSession、FieldDirector |
| fieldActions | 野外资格/目标、操作预检、演出与世界提交、钓鱼会话协调 | FieldActionService、FieldActionDirector、FishingSession、actionBusy |
| movement | 移动资格、交通模式、冲浪与飞行协调、访问目的地 | MovementService、MovementInputSession、TravelService、TravelDirector |
| triggers | 步进时钟、剧情/训练家视线/遭遇优先级 | 无复制状态 |
| frame | 每帧的领域更新与 NPC 暂停/育成提醒协调 | 无复制状态 |
| inspection | 将会话和地图投影成诊断视图 | 无领域规则 |
| presentation | 校验演出资格并调用演出端口 | 无领域规则 |

它们是本内容包的应用层，协调通用 `engine/` 领域服务；战斗公式、库存不变量、进化规则和碰撞规则继续由引擎负责。新增内容/插件仍使用已公开注册与命令，不直接导入这些内部服务。

## 显式、实时的依赖端口

每个服务导出自己的 `*_PORTS` 合同，只接收列出的依赖，不接收整个 EmeraldAdventure，也不直接导入其他应用服务。`ports.js` 校验缺失/多余依赖，拒绝可写端口。跨服务调用由 `composition.js` 和门面连接，服务内部无法凭一个 `game` 引用遍历所有模块。

端口使用实时 getter：读档会替换 state、rng 和领域会话，服务每次读取取得当前所有者的对象，避免闭包抓住旧存档。依赖属性不可被服务替换；领域对象本身仍由可信应用用例协调修改，这是共享身份的既定设计，不能误称深度只读或安全沙箱。插件边界仍由只读查询、权限与命令事务保护。

`public-ports.js` 的冻结 APPLICATION_FIELDS / APPLICATION_METHODS 明确列出字段和方法的唯一所有者，不推断服务名、不遍历实例自动暴露全部方法、没有旧版本分支。方法访问器返回稳定回调，每次调用读取当前服务并保留该服务的 this、参数、结果和错误；UI 命令代理可以提供受校验的路由而不违反 Proxy 不变量。

宿主字段为实时只读 getter；只有可信宿主重载使用的 state 和外部剧情锁 storyBusy 可赋值。领域对象身份由服务持有，没有两份状态需要同步。测试故障注入针对拥有用例的应用服务，不覆写公共入口；插件不接触这些内部对象。原 compatibility.js 和无人使用的 game-pack.js 转出口已删除。

## 重载生命周期

加载/重开先更换保存服务的 state，再由 bindField 依次重绑 RNG → 形态 → 育成 → 时间 → 天气 → 树果 → Actor → 世界。世界绑定动态覆盖后，显式调用移动服务重绑，再创建 FieldSession 与导演并重绑机关与野外行动服务，再绑定接触与遇敌仓储，最后重绑插件。浏览器/UI 生命周期由宿主继续驱动；这些服务不读取 DOM 或 localStorage。

## 继续开发约束

新用例放入拥有该领域的服务；跨域用例声明所需命令/查询端口。不要在 adventure.js 增加招式结算、库存写入、剧情分支或大型指令表；不要把整个门面转交给新服务。只有真实新增共享职责才扩展公共引擎合同。

验证记录见 docs/project/CHANGELOG.md。application-services.test.js 守卫门面职责与文件规模（少于 160 行）、全公共方法的所有权/接收者/结果/替换/不可覆写、单一状态所有者、读档后的实时依赖、依赖不可拓宽/覆盖以及应用服务的导入方向。各领域组合回归不每次重复，修改涉及它们的合同或生命周期时再失效重查。

地图访问生命周期见 docs/engine/world/STATE_AND_LIFECYCLE.md。门/相邻地图/飞行/野外行动/剧情共用入口；TravelService 通过受控 enter 端口提交，不再提前修改玩家位置。读取存档恢复当前访问，不清除当前临时状态。

学习领域/公共命令/事务与背包协作见 [MOVE_LEARNING.md](../engine/items/MOVE_LEARNING.md)。当前 registry 资格和手动等级学习共享保护集合；ItemService 不允许通过道具效果改 moves。

天气命令与剧情经 WeatherApplication 的独立有限端口；世界/时间/帧通过 composition 调用 enter/step/days/tick，业务不导入兄弟服务。见 [WEATHER.md](../engine/world/WEATHER.md)。

登记道具由 ItemShortcutApplication 独立协调；可登记但暂不可用的道具不缓存旧资格，使用时交还现有物品/野外行动管线。当前应用数量、入口规模与保存版本见根架构/README；详见 docs/engine/items/FIELD_ITEMS.md。InventoryApplication持有唯一库存政策；商店/奖励/采摘/持物/学习/进化/战斗控制者使用同一槽位服务。bagView/itemQuantity只查询，inventoryPreview不生成可提交计划。现行合同见 docs/engine/items/INVENTORY.md。

公开地图快照、暗雷政策、宿主随机选格和接触凭证战斗见[ENCOUNTERS_AND_CONTACTS](../engine/world/ENCOUNTERS_AND_CONTACTS.md)。保存13为野生个体提供唯一仓储；Actor移除和战斗结算通过装配端口释放关联，插件不导入应用服务。

AppearanceApplication拥有视觉选择，ViewApplication组合相机配置与环境层的独立所有者；二者通过有限端口接线，地图访问和读档由装配器交接清理，不向adventure增加领域实现。
