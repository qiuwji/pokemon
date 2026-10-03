# 天气领域、战斗映射与注册式表现

状态：2026-10-03 首轮领域与组合证明已通过；真实浏览器/全作素材对比留到 E。当前存档版本 **9**，weather 为必需字段；最初在版本 8 引入天气，不迁移旧版本或自动补坏档。

## 所有权与依赖

`WeatherRegistry` 接收明确的 defaultWeather 政策并校验声明（绿宝石设 clear，其他内容包可选自己的默认），`WorldWeather` 只管理世界选择/覆盖/周期/保存；`WeatherApplication` 用有限端口接地图入口、坐标步进、时间、事件与 UI。世界服务不引用 Battle、DOM、画笔或规则随机数。

`BattleWeatherRegistry` 单独管理战斗天气的绘制引用、气象球属性和持续伤害政策。Battle 在创建时复制当前野外天气的战斗身份，之后战斗招式/特性只改变 Battle.weather。不会倒写野外，也不会在招式天气结束后恢复另一份野外天气。

`WeatherDirector` 纯时钟取样，输出天气视觉与透明度，600ms 平滑混合并保留中断时的混合权重。`WEATHER_EFFECTS` 复用雨线/粒子/色调/雾片；environment-canvas 仅通过 PresentationRegistry 分发，不再按雨/晴/沙/冰分支画图。室内是否有天气由定义决定，水下气泡、洞穴雾与插件房间不会被 indoor 标记一概屏蔽；昼夜色调仍遵守原有室内政策。

## 原作依据与明确取舍

只读参考 `work/pokeemerald` 修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：

- `include/constants/weather.h`：地图头天气与坐标天气为两套编号，不能直接复用编号。
- `src/field_weather_effect.c`：TranslateWeatherNum、SetSavedWeatherFromCurrMapHeader、UpdateWeatherPerDay、Task_DoAbnormalWeather。
- `src/coord_event_weather.c`：走到坐标格触发天气，离开该格不会自动撤销。
- `src/clock.c`：每日阶段推进；沿用现有 RTC/时间业务推迟政策。
- `src/battle_util.c` 的 ABILITYEFFECT_SWITCH_IN_WEATHER：雨/雷雨/暴雨→战斗雨；沙暴→战斗沙；干旱→战斗强烈日照。普通晴天、云影、飘雪、雾、灰等不凭画面启动对应战斗规则。
- `data/maps/*/map.json`：导入 **518** 个地图头和 **86** 个天气坐标，只是参考元数据，当前仍只有 9 张基础可玩地图。Route113 头为晴，灰来自坐标及地图脚本，不能将整张道路头改成灰。

119 阶段为晴/雨/雷雨/雨，123 为晴/晴/雨/晴。保存累计 day，读取按周期取模；每日推进阶段，当前已选天气保持到入图/再次触发/设置时再解析，符合 TranslateWeatherNum 的调用方式。

异常天气以 `[downpour,drought]` 与 `601*1000/60` 毫秒相位声明：源码从 600 使用 `tDelay-- <= 0`。只累计前台世界帧，战斗/隐藏间隔不推进，恢复不吞入宿主离线时间。**保存演出相位是本项目可维护的生命周期决定**，不是原卡带任务数据保存的声称。粒子、雾与色调为当前程序化像素演出，尚未还原原版调色板/天气精灵；雷雨暂不闪屏。

## 内容合同

世界天气 `weather` 内容：

```js
{ label: "雨天", visual: "weather.rain", battle: "rain" }
{ label: "道路周期", cycle: ["clear", "rain", "thunderstorm", "rain"] }
{ label: "限时轮换", cycle: ["downpour", "drought"], periodMs: 10000 }
```

cycle 只能引用非周期定义，不能同时指定 visual/battle。periodMs 仅用于前台相位；未指定则用保存的每日阶段。未知引用/字段、递归周期和非法时长在启动失败。

地图 `map.weather`：

```js
{
  default: "clear",
  regions: [{ x: 3, y: 8, width: 1, height: 1, elevation: 3, weather: "rain" }]
}
```

范围有界；width/height 默认 1。elevation 未设或 0 为任意高度，否则匹配实际高度。重叠区域按声明顺序取第一个。不能继续把领域天气放进 `map.presentation.weather`，旧路径明确拒绝。原生地图从参考导入默认配置；插件地图自行声明。

战斗天气 `battleWeather`：

```js
{ visual: "weather.sand", weatherBall: "rock",
  residual: { divisor: 16, immuneTypes: ["rock", "ground", "steel"] } }
```

持续伤害仍经 weather-immunity 阶段；Cloud Nine/Air Lock 通过现有 weather 修饰压制有效天气，不删除底层天气记录。伤害/命中/速度等数值规则使用已有受控规则挂钩，不在绘制器里算。气象球/持续伤害/天气设置不再使用封闭四项分发表；Gen3 类型与原作数值政策仍保留在规则合同中。同类天气招式仍花 PP，但失败且不刷新期限；该事实进入招式事件。静态招式/特性/状态的天气引用在开战前检查，动态效果提交时再次检查。

## 操作与剧情

- `core.query` 包含当前冻结 weather；`core.weather.query {map?}` 查任意地图，读操作不要求 weather 写权限。
- `core.weather.set {map,weather,durationMs?}` 设地图覆盖；无期限一直保存，有期限使用本地游戏 RTC，到期一次恢复地图默认。尚未设时钟不可建立有限期限。
- `core.weather.clear {map}` 撤销覆盖；不是清除所有天气注册内容。
- 写命令需要插件 `weather` 权限，并沿用移动/战斗/剧情锁。可由既有网络命令协议调用。
- 插件事务用 `ctx.intent({kind:"weather",map,weather,durationMs?})` 或 `{kind:"weather",map,clear:true}`；库存/天气等多意图失败一起回滚。
- 剧情命令 `{type:"weather",weather:"rain"}` 设置当前访问天气，重新入图按头/覆盖恢复；整段剧情先验证，parallel 的 weather 资源不能竞争。剧情使用专门的可信端口，不绕过普通命令的锁。
- `core:weather-changed` 发布冻结视图；远程地图直接设置时事件包含该地图，HUD 刷新当前地图。事务中的事实推迟到成功后下一帧发出；失败恢复 revision，不发出撤销事实。

来源 map/coordinate/script/override、实际 kind、原选择 selection、每日阶段、相位时间、覆盖期限与 revision 保存于唯一 state.weather。恢复校验地图/天气引用、来源一致性和相位。ExtensionCatalog 将插件天气/地图引用列入 contentDependencies；缺插件保护原档，不能回退成晴天。

## 插件示例

```js
// 放在 manifest.setup(api)，manifest.permissions 包含 "weather"。
api.presentation.effect("mist", {
  draw(ctx, frame) {
    ctx.fillStyle = "#604080";
    ctx.globalAlpha *= frame.reducedMotion ? 0.08 : 0.12;
    ctx.fillRect(0, 0, frame.width, frame.height);
  }
});
api.content.register("battleWeather", "smog", {
  visual: "garden:mist",
  residual: { divisor: 16, immuneTypes: ["poison"] }
});
api.content.register("weather", "smog", {
  label: "毒雾", visual: "garden:mist", battle: "garden:smog"
});
// garden 为 manifest.id。新增天气不改核心绘制器或世界/战斗分支。
// setup 后从事件/交互入口执行，不能从只读回调或事务中嵌套 dispatch：
await api.commands.dispatch("core.weather.set", {
  map: "Route101", weather: "garden:smog"
});
```

## 验证与剩余内容

weather.test.js 新 **18** 个证明各有通过记录：来源元数据、坐标/高度/入口、每日阶段、覆盖/期限/失败无写、注册拒绝、异常相位、战斗免疫/压制/气象球/期限/特性、纯 crossfade、全部天气绘制的确定性/透明度/reducedMotion、命令/保存8/旧版拒绝、插件内容/权限/依赖、离线日阶段、剧情验证/并行竞争、事务部分执行回滚与事实、实际 BattleApplication 接线、前台暂停/重载、真实 Renderer 的地图键/室内天气/领域只读。

受影响原有 282 项中 281 首次通过；UI 文档注入修复后该项通过。补剧情/事务接线后相关 48 项通过；内容/严格类型/246 模块检查通过。未重复全部工程，不把分批证据写成全量通过。模块逻辑、注册/命令/保存/时间/绘制合同变化才使对应证据失效。

未完成：全丰缘天气剧情（Route113 入图灰、气象研究所/盖欧卡固拉多剧情、Terra/Marine 洞穴选择）、火山灰采集业务、天气 BGM/SE、原作精灵/调色板素材与浏览器对比。天气不是场地或空间；现代 Terrain/Trick Room 独立生命周期仍按原路线推进。

当前保存版本更新为9（新增必需登记道具字段），天气必需字段与原文保护保持；18个天气场景在快捷/保存改动的受影响检查中再次通过。首次天气版本8的证据属于当时阶段，不是当前envelope版本。
