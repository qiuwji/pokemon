# 界面、资源与表现

先读 [UI_CONTRACT](../../../docs/engine/presentation/UI_CONTRACT.md) 的相关节点和宿主位置，再选一个示例；不需要同时加载所有表现合同。

## 页面与已有区域

- 新页面用 `api.ui.page` + `api.ui.entry`，已有位置追加用 `api.ui.region`，共用布局用 `api.ui.component`，常驻投影用 `api.ui.hud`。保存完整注册 ID，参数/schema 中显式声明点击携带的 context、input、pointer；不要假定宿主会过滤额外字段。
- [plugin-page](../../../examples/plugin-page.test.js) 是最小入口；表单、提交与组合查 [表单夹具](../../../tests/fixtures/extensions/form.js) 和 [plugin-ui](../../../tests/plugin-ui.test.js)。字段 name 由宿主汇总一次提交，页签选择归适配器，持久业务记忆才放 store。
- region 默认追加；`replace/hide` 只用于合同实际开放的位置，原生按钮通过 `button.native` 及 context.controls 复用。授权、禁用条件与领域提交仍归宿主。核对 [native-ui-regions](../../../tests/native-ui-regions.test.js) 的竞争、异常回退与过期句柄，不在 render 发命令。
- `api.ui.slot(localId,{parent,priority?})` 注册子挂载位置；父位置先存在，子位置随父位置挂载、继承上下文并释放。根位置数量不是插件位置上限，但 slot 也不等于任意 DOM 或替换原生 HUD 的权限。
- 布局返回声明式树，不塞 HTML、CSS、函数或 DOM 节点。主题用合法 token，不编造节点；查 [ui-registry](../../../src/engine/extensions/ui-registry.js) 的 `UI_SLOTS`、`resolveLayout`、`validateLayout`。

## 区分三种绘制方式

| 任务 | 合同与示例 | 不承担什么 |
| --- | --- | --- |
| 页面/区域里的装饰或点击 Canvas | `presentation.register` + layout canvas；[plugin-canvas](../../../examples/plugin-canvas.test.js) | 不拥有游戏逻辑循环、命中或奖励 |
| 素材裁切与多帧片段 | [SPRITE_CLIPS](../../../docs/engine/presentation/SPRITE_CLIPS.md)、[sprite-clip](../../../examples/sprite-clip.test.js)；`presentation.sprite` | 不由图高猜原作时序，不代替状态机 |
| 实时小游戏的每帧画面 | [实时会话参考](battle-and-interactions.md)；`interactions.view → FrameData` | 不自建 HTML 假游戏或原始 Canvas 循环 |

presentation Canvas 回调可以用宿主给的绘制 context、冻结 frame 和 assets；这是受控绘制端口，不是 DOM。实时会话 view 则只返回 FrameData，两者不能混写。

注册视觉后返回 canvas 节点，节点只带 visual、尺寸、schema 参数和合法 action。持续循环由宿主驱动；循环定义不拿去做一次性 play/feedback。页面关闭、重建、隐藏、取消与读档后的资源由宿主生命周期释放；不缓存页面节点或自己 requestAnimationFrame。点击坐标由宿主投影，schema 要接收对应 pointer。

一次性剧情/战斗演出按 [ANIMATION_CONTRACT](../../../docs/engine/presentation/ANIMATION_CONTRACT.md) 注册语义事件与纯取样；规则先提交，画面随后播放。音频用真实注册资源，不能拿合成提示音冒充原作资源。

## 外观、相机与环境

读 [APPEARANCE_AND_VIEW](../../../docs/engine/presentation/APPEARANCE_AND_VIEW.md)，锚点 [visual-extension](../../../examples/visual-extension.test.js)。

- 玩家/Actor 外观用 appearances、身份选择与临时覆盖；不借 world.patch 或换 movement 模式伪装换装。身体/服饰共享方向和时钟；所需图集与透明层由插件提供。
- 相机 profile 表达逻辑格数/缩放；临时租约表达焦点与优先级，结束回到有效选择。绘制和指针使用同一投影，不另写固定坐标偏移。
- environmentLayers 是独立视觉层，可叠加逻辑天气；普通雾不等于持久探索/视线政策。是否支持战争迷雾先核对 [PLUGIN_ROADMAP](../../../docs/project/PLUGIN_ROADMAP.md) 与代码。
- 临时相机/环境/外观租约不保存。确需持久偏好，用 store 保存业务意图，并在合法时机重新申请；不要保存旧 token。

## 素材与最小验证

资源引用查现有注册方式；派生 PNG/音频/图集由工具写 generated，插件自有资源保持清晰归属。骑乘素材看 [移动玩法参考](world-and-gameplay.md)，不把战斗图片直接当野外图。

验证实际入口查询与 action、目标 UID、无权限拒绝、关闭/取消/读档清理、reducedMotion、布局异常回退。动画用固定宿主时钟断言帧采样和停止，不能靠等待真实毫秒。图集检查裁切范围、资源路径和大小；Canvas 端口夹具只验证绘制协议，不代表真实缩放、焦点、触屏或听音已验。用户限制浏览器操作时遵守，并明确未观察的视觉项目。
