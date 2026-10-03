# 桥面机关与外观覆盖

## 所有权

通行/高度继续属于 World 与 ElevationPolicy。FieldDevices 持有机关记录与局部任务；WorldStateService 持有已校验的逻辑图块和可选外观覆盖；Canvas 消费投影，不推断机关阶段。绿宝石政策在 packs/emerald/bridge-mechanisms.js，不在移动器或绘制器按地图名称分发。默认地图仍为现有 9 张，Fortree/Pacifidlog 的完整地图/图集待业务导入。

## 通用接口

FieldDeviceDefinition 新增可选 `footprint:[{dx,dy},...]`。省略表示锚点一格；显式数组需 1..16 个、不重复、含 {0,0}、全部在地图内。Catalog 将其标准化，多个格子共享一个 device ID、状态与任务。matches 仍校验高度，面对任一覆盖格可按原有交互入口操作。

策略新增 activate：新地图访问提交后的当前位置激活，初次绑定亦执行；当前访问读档不重复激活，避免覆盖保存的动画阶段。enter/leave/settle 仍按玩家源/目的位置匹配一次共享机关。上下文增加只读 tiles（仅 footprint 范围的 x/y/block/behavior），不复制全地图。enter.payload 有 from/fromTile，leave.payload 有 position，策略据此区分内部跨格与离开整个机关。

世界 tile operation 新增 `appearance:metatileId|null`。数字为当前 tileset 中 0..1023 的有效图块；null 清该层外观覆盖。它与 block/behavior 独立，不能改变碰撞、高度、遭遇或互动规则。投影 map.appearances 是冻结的稀疏索引表，renderer 按格使用 appearance ?? blocks；依然绘制 8×8 tile/16×16 metatile，不生成整景图。

appearance 与已有永久/visit 分层一起保存/恢复，visit null 可遮掉永久外观；重新入图恢复当前访问覆盖。合法图块引用在预检与读档校验，失败不提交部分图块。此字段也可以由插件 world.patch 使用，不必开发专用桥动画 renderer。

机关事件前将允许推进的局部时钟同步到事件发生时间，然后再安排新任务；tick 只推进余量。暂停政策由 FrameApplication.paused 单独计算，经有限 simulationActive 端口注入 DeviceApplication。菜单/对战/剧情/领域演出/后台冻结局部计时，没有为桥再创建一个时钟。

## 原作政策

只读参考 work/pokeemerald SHA 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：src/field_tasks.c 的 FortreeBridgePerStepCallback、TryLower/TryRaise、PacifidlogBridgePerStepCallback、三组双图块偏移表及 ShouldRaise/ShouldSink；include/constants/metatile_labels.h；include/config.h 默认没有启用 BUGFIX。

### Fortree

`fortree-bridge` 一格一机关，config `{raised,lowered,lowerOnEntry?}`。

- 初始站在桥上：立即压低；奇数通行平面为桥下，不压低/回弹。
- 桥→桥：旧格升起，新格压低。
- 默认保留未启用 BUGFIX 的参考行为：从普通土地首次踏上桥段不压低。作者可显式 lowerOnEntry:true 选择修复政策，而不是在核心隐式修复原作。
- 离开后回弹：逻辑图块升起，局部第 4/11 帧只显示压低外观，第 8/15 帧恢复外观；对应原任务起始 16→15，counter %7 的两个低谷与最后恢复。重新进入取消旧回弹，防止快速来回时旧外观覆盖当前脚下。
- 高度/碰撞高位保持，behavior 不改变。timer/state/facts 与其他机关共用事务。

原图块对：草地 raised=0x24E/lowered=0x24F；树木 raised=0x256/lowered=0x257。这些是正确 Fortree tileset 内的资源编号，不能在不相符图集里当有效资源使用。

### Pacifidlog

`log-bridge` 一个机关占两相邻格；config.tiles 与 footprint 顺序一一对应，每格 `{floating,half,submerged}`。

```js
api.content.register('fieldDevices', 'logs', {
  map: 'MyMap', x: 4, y: 3, mechanism: 'log-bridge',
  footprint: [{dx:0,dy:0}, {dx:1,dy:0}],
  config: { tiles: [
    {floating:0x250, half:0x252, submerged:0x254},
    {floating:0x251, half:0x253, submerged:0x255},
  ] },
});
```

- 从外部踏上：两格半沉，8 帧后完全下沉。
- 同一木桥两端之间移动：保持完全下沉，不产生一次额外升/沉循环。
- 离开整个木桥：逻辑两格立即浮起，外观保留半沉，8 帧后恢复浮起；这对应参考“画半沉，再设置浮起但不重画”。
- 新图激活时已站在木桥：直接完全下沉。
- 重进/快速返回取消过期 sink/rise，保存当前阶段和剩余任务；不会靠渲染结果决定下一格是否可行。

垂直 top/bottom 分别 floating=0x258/0x260、half=0x259/0x261、submerged=0x25A/0x262。两格的配置与形状在启动时校验。完整原图集、SE_PUDDLE/SE_BRIDGE_WALK 音效编曲、原 GBA 全局回调阻塞相位和逐像素画面仍需后续内容/系统验收；当前连续时钟与可取消任务政策不宣称整机仿真。

## 验证与失效

bridge-mechanisms 新增 8 项分别通过：外观与规则分离/保存恢复/拒绝引用、Canvas 逐格选择、原作默认入口/桥间/回弹、激活/桥下/快速回踩、双格升沉/内部跨格、暂停/读档/重进/事件计时起点、footprint 拒绝/共享身份、桥资源与形状校验。暂停夹具原先在解除暂停后多推进 100ms，超过剩余期限；按正确时间顺序修正后只重查失败项通过。

相关 world/device/elevation/application/architecture 41 项首次 40 通过；旧 matches 测试直接传未标准化摆放，更新为 Catalog 设备后只重查该项通过。内容引用、公开严格类型和 236 模块语法检查通过。没有重复全量回归或浏览器画面检查。

修改高度政策/appearance 投影、footprint 匹配、入口/事件顺序、暂停/局部任务、保存或 Canvas 格子绘制时重查对应项。未变化模块沿用有效证据，最终阶段 E 做系统与实际资源画面/听感验收。
