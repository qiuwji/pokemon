# 可注册演出与纯轨迹取样

状态：2026-10-03，轨迹/战斗事件演出首轮已针对性验证。现代机制规则、Actor 持久服务、多宿主效果生命周期仍在路线中。

## 分层

1. `engine/extensions/visual-contracts.js` 是描述合同和纯数据片段工具，校验结构/引用/时序。没有导演、绘制器或浏览器依赖。
2. `presentation/animation-timing.js` 只将标准化时间算成进度/数值参数。没有时钟读取、随机数、DOM、伤害或命中计算。
3. `PresentationRegistry` 管理效果、招式和战斗语义事件描述，结合座位布局取样为 effects/poses。
4. `BattleDirector` 拥有注入时钟、事件排队、默认演出与 reducedMotion。规则快照与生命周期不由插件动画决定。
5. 绘制适配器依旧调用注册的 effect。新增粒子/画法局部注册；新增编排写描述；新增规则在领域实现后发射语义事件。

已有招式描述继续使用原字段，默认线性、无关键帧、无条件；默认导演演出保留，渐进迁移。未全量重写各导演。

## 轨迹合同

- effect：注册效果 ID；anchor：actor/targets/field；start/end：0..1 的片段区间。
- easing：linear/in-quad/out-quad/in-out-quad/smoothstep/step-end。
- when：always/hit/miss；使用已提交的逐目标 successful 事实，不计算概率。
- parameters：静态 JSON 参数；keyframes：至少 2 帧，从 at=0 到 at=1 严格递增。每帧 values 包含相同的有限数值通道，帧上的 easing 决定到下一帧的插值。
- 全局缓动先重映射片段进度，再进行关键帧分段插值。颜色等非数值保持 parameters 静态值，复杂粒子由已注册 effect 取样参数绘制。
- poses：类似轨迹，绑定 actor/targets；只允许 x/y/scale/opacity，不允许 hp/状态/能力等领域字段。多条姿态轨迹按声明顺序覆盖同一属性，不暗中改变行动。

`placeAnimationTracks(fragment, start, end)` 从公开合同工具导入，映射可复用轨迹的区间，局部关键帧不变，输入不变。可用相同粒子描述组合蓄力/释放/多段命中。没有实现任意程序分支解释器或无限循环脚本。

field anchor 使用视口中心/尺寸（默认战斗画面 320×224），驱动可提供其他视口。视图结果包含 anchor/scope、source/target、座位、属性与成功事实。取样返回分离的数据，绘制回调收到只读副本。

## 图元参数与调色板注入

effect 收到的 visual 在通用字段（kind/source/target/anchor/scope/seat/side/type/successful/t/progress）之外，可携带 `track.parameters` 展开的任意有限数值/字符串绘制参数。参数含义由已注册 effect 自行约定，表现层不解释；缺省时每个图元回退到自身既有的绘制行为，因此无参数的旧配方不变。当前内置图元使用的参数（示例）：颜色 `color/color2`、数量 `count`、像素 `pixelSize`、环形 `radius/reach/squash`、弹道 `lead/span/trail/wobble/arc/taper/burstAt/burst*`、火焰 `ember*`、水泡 `speed/gap/cycle/sizeStep`、状态 `base/step/lineWidth`、刀光 `steps/stepX/stepY/spread/origin*`、雷电 `drop/step/zig/zag`、光束 `growth/lineWidth`、落石/沙 `drop/fall/spread/phase`。具体取值属于内容，写在 pack 配方里。

调色板是装配注入端口：`PresentationRegistry({ typeColors })` 与 `BattleDirector({ typeColors })` 接收 `(type) => colour`。取样时若配方未显式给 `color`，则用该端口解析招式属性对应的颜色；表现层不再内置属性色表（原 `TYPE_COLORS` 已移至 pack 的 `battle-palette.js`）。显式配方颜色优先于注入调色板。

## 战斗语义事件注册

```js
api.presentation.battle("mega-entry", {
  kind: "form",
  match: { formId: "my-plugin:mega" },
  priority: 10,
  mode: "replace",
  animation: {
    duration: 1000,
    tracks: [{
      effect: "my-plugin:burst", anchor: "actor", start: 0, end: 1,
      easing: "smoothstep",
      keyframes: [
        { at: 0, values: { radius: 0 } },
        { at: 0.5, values: { radius: 30 } },
        { at: 1, values: { radius: 0 } }
      ]
    }],
    poses: [{
      anchor: "actor", start: 0, end: 1,
      keyframes: [
        { at: 0, values: { scale: 1 } },
        { at: 0.5, values: { scale: 1.3 } },
        { at: 1, values: { scale: 1 } }
      ]
    }]
  }
});
```

kind 是领域已发射的事件。match 对事件顶层标量做字面匹配；不是可修改规则的回调。优先级更高先选，再选更具体的匹配，最后按 ASCII ID 排序。相同 kind+match 注册冲突在组装时拒绝，不会悄悄按加载顺序覆盖。未知效果引用也在注册/组装时失败。

replace 取代默认事件的姿态/特效编排；append 在默认编排上增加特效/姿态。该定义拥有单次事件演出的时长（1..10000ms）。不会重新结算伤害、消费道具或替换规则快照。HP 展示插值、倒下/捕获隐藏与事件结束清理由原导演负责；reducedMotion 缩短事件并抑制运动/特效，保留规则、消息与 HP 展示。

新增动画本身不会创造新事件。Mega 的 form 事件已有来源，这个例子验证演出接口，不证明现代形态的 HP/类型/招式/资格全实现。Z 招式的动作替换/限次/消费需要继续补领域合同；不能以播放这个例子替代规则验收。

## 已验证与下一步

新增 animation-timing 9 项：插值/缓动、片段重映射、逐目标命中分支、严格合同、事件选择/冲突、插件 form 与 reducedMotion、append、招式姿态、无 actorSeat 的全屏事件锚点。

一次受影响 animation-timing/visual-registry/presentation/plugins/architecture/field-actions 73 项，72 首次通过。插件事件定义附带宿主 id/owner，触发严格合同拒绝；在装配边界剥离宿主元信息后只重跑失败项通过。新增全屏锚点 1 项及受影响逐目标取样通过；模式分发整理后只重查替换/附加 2 项。新增表现无 Math.random 守卫单项通过，公开类型检查通过。

尚未完成：把全部默认导演阶段改为独立处理器、DOM/SVG 宿主生命周期、完整逐招式原作脚本、原创/参考素材浏览器对比。既有 Scene/Transition 已可注册 draw，不重复建设接口。

失效条件：轨迹字段/缓动/插值、事件选择/注册冲突、reduceMotion、领域事件投影、座位布局、装配或绘制副本合同变化，重查对应范围。全系统与肉眼验收仍留到 E。

天气环境的声明/注册画师与纯 crossfade 已接入并专项验证，见 WEATHER.md；DOM/SVG 多宿主生命周期仍未完成。


## 野外对象逐帧通道

场景注册支持`objects(frame) => [{map,id,x,y}]`。x/y是视觉像素偏移，不是格子坐标；每帧最多64个、同map/id不可重复，每轴±64像素。回调同步读取冻结frame，无随机数或规则写入。绘制器与既有野外行动偏移相加；reducedMotion返回空列表，异常隔离并只报告一次。纸箱弹跳复用此通道，原生静态偏移放appearance定义。纯取样单测不能证明浏览器观感已验收。

## 捕捉及具名声音时间点

BattleDirector的cuePlan(event,{duration,reducedMotion})返回一次性{id,at}列表，onCue接收具名资源ID；未提供时沿用原事件回调。通用timed-cues验证时间点并使用注入Timeline串行等待，sample/draw不发声。原作资源和映射在pack的battle-audio.js，不从表现层导入pack。该构造端口供宿主装配，尚不是新的插件注册合同；插件既有audio/battle/visual接口仍保留。

ball/capture事件附带所用item元数据，ballResource构造端口选择原图。位置按targetSeat布局计算，不固定投向单打敌方坐标。规则捕捉四次成功判定在原作显示三次摇晃；导演只截取可见次数，不改规则计数。成功/失败消息在全部动画之后，再等待阅读时间；不能从第一帧提前覆盖投球文案或进入结束转场。替换演出仍不决定捕获成败。
