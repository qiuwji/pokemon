# 移动与旅行接口

现行移动合同见下文；版本/进度以README/STATUS为准。v0.8.0当时保存4、248项系统与12项移动专项为历史证据，旧开发档不迁移。

## 职责与依赖

- `engine/movement.js`：注册模式、校验权限、生成速度/通行/落脚后模式计划，管理连续行进的加速状态。模式名称属于内容，不写在 World、动画或寻路中。
- `engine/world.js`：网格、障碍、NPC 位置及预约、跳崖、门和相邻地图连接。通过 passage 接口查询模式规则。移动计划在坐标提交前校验，错误扩展不会先移动玩家。
- `engine/field-session.js`：安排一步移动和动画结束后的提交。`onProgress` 记录所有完成的步数；`onStep` 只触发正常探索事件，剧情自动行走不会遇敌。二者分离允许孵化/育成推进而不误触剧情。
- `engine/pathfinding.js`、`engine/field-director.js`：自动路径与实际行走使用相同通行策略，剧情 move 命令可指定 mode。另一个内容包的 glide 模式已有复用验证。
- `engine/travel.js`：验证飞行权限、到访记录、室外起点、落地位置。计划检查发行者、起点和实时占用，不能重放或跨服务使用。
- `presentation/travel-director.js`：起飞、遮幕、降落，不计算权限或目的地。只有全屏遮幕完全覆盖时调用地图提交；失败则在原位置降落并释放输入锁。
- `adapters/canvas-renderer.js`：角色帧表、锚点、坐骑独立图层、飞行采样。地图依然由 8×8 原始图块组成 16×16 网格。
- `packs/emerald/movement.js`：步行/跑步/音速自行车/越野自行车/冲浪定义、目前两个飞行落点。
- `packs/emerald/movement-interface.js`：旅行菜单和岸边冲浪确认，只请求 Adventure 的操作接口。

## 可玩范围与规则边界

移动资格由库存/徽章/队伍招式驱动；研究装备领取和旧自行车旗标旁路已删除。两种自行车各需实际持有对应道具，鱼竿同理；冲浪需天秤徽章和队伍招式，飞行需白羽徽章和队伍招式。背包声明行动的合同见 [ITEM_ACTIONS.md](../engine/items/FIELD_ITEMS.md)，原作获得剧情交后续地图内容。

音速自行车连续前进逐步加速，转向/碰壁重置；普通草丛可骑行，长草禁止音速自行车。骑车读取原地图 allow_cycling，可在允许骑车的洞穴使用；自定义地图通过 allowBike 声明。冲浪上水/下水均走完整网格动画，模式在落脚时提交；相邻水域共享连续世界坐标，不插入切场遮幕。靠岸改为步行。103 号道路使用原作冲浪遇敌表；玛瑙水母已补入，尚未导入的学习招式明确记录在 unavailableLearnset。

飞行目的地必须曾到访且落点仍有效。两镇之间使用起飞、遮幕及降落演出；当前没有全丰缘飞行地图及完整的特殊交通关卡；潜水/攀瀑/钓鱼合同已接入，原始地图与素材未全部导入。Acro 抬轮/跳跃/侧跳/转向跳输入与纯动作采样见 docs/engine/field/MOVEMENT_INPUT.md。本阶段交付移动模式与表现接口，以及计划中的骑车、冲浪、飞行基础玩法。

## 资源与验证

`tools/import-movement.py` 从 pret/pokeemerald 的原作人物帧、SurfBlob、Bird 导入透明逐帧图，不生成整幅地图背景。内容校验检查原生尺寸、方向帧、锚点及坐骑引用环。`tools/import-species.py` 和 `tools/import-water-encounters.py` 以增量方式保留现有地图及规则。

历史浏览器验证（研究装备入口现已删除，不代表当前资格链）：领取装备、切换自行车、103 号道路岸边上水、水面连续移动、靠岸、飞行到古辰镇、恢复探索输入。移动专项检查覆盖注册错误、持续加速、连接地图、NPC 预约、剧情时钟分离、异内容包复用、飞行计划过期/重复提交/失败恢复、原生资源及存档位置和模式的一致性。

本地开发改用 `tools/serve.py`，禁用资源缓存，避免重载时混用新旧 ES 模块；此设置只服务开发。

当前物品/资格/钓鱼/地图许可/存档证据见docs/engine/items/FIELD_ITEMS.md 与 docs/project/VALIDATION.md；新版真实浏览器在 E 回归，历史截图不证明已删除的旁路或新增道具页面。


## 通用移动结果

FieldSession 与 NPCSystem 共享 [MotionResults](../../src/engine/motion-results.js)，FieldDirector 复用同一报告器。引擎只生成冻结 start/settle/blocked/cancelled 结果；WorldApplication 在应用层映射为 `core:motion`，事件传输及订阅属于宿主。实体、时钟和取消规则见 [ACTORS](../engine/actors/ACTORS.md)。没有路线历史、追随关系或宝可梦判断；跟随插件决定如何消费事实，通行与预约仍由既有World/NPCSystem执行。

## 移动原因词表

[blocked-reasons.js](../../src/engine/blocked-reasons.js)是阻挡与生命周期取消原因的唯一声明；冻结常量供调用处引用，列表供World/MotionResults校验。包括World的7种、玩家前置2种、passage兜底及静态NPC的3种阻挡原因，不混入disposed等取消原因。未声明值在分配序号/发布前抛错。

MotionResult按phase区分：started/settled的reason为null，blocked为BlockedReason，cancelled为MotionCancelReason。类型通过JSDoc const字面量推导自运行时数组；合同检查启用allowJs，原因模块另纳入checkJs。无需重复抄联合类型。switch可拒绝拼错分支，但默认不会报告所有遗漏，消费者要在default使用never检查；[类型用例](../../tests/contracts.typecheck.ts)展示写法。
