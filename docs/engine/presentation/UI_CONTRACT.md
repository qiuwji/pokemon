# 插件声明式界面与宿主区域

本合同使插件能在已有页面加入入口和交互内容，并复用表单、页签、列表与表格。插件返回声明式树；校验与组件展开在 engine/extensions 中，原生控件绘制及草稿在 adapters 中，页面导航/输入锁由 shell 持有。插件不获得 DOM 或可写 game。

## 注册与使用位置

| API | 定义 | 用途 |
| --- | --- | --- |
| ui.page(id, definition) | title、render(view)、when? | 独立页面，仍沿原导航合同 |
| ui.entry(id, definition) | slot、label、page、when?、priority? | 在宿主区域加入打开页面的按钮 |
| ui.region(id, definition) | slot、mode?、render(view)、when?、priority? | 在现有页面直接加入一棵交互树 |
| ui.component(id, definition) | schema、render(props, view) | 可复用、有参数校验的声明式组合组件 |
| ui.theme(id, tokens) | 下文颜色及数值 token | 像素界面主题 |
| ui.hud(id, definition) | render(view)、when? | 常驻扩展内容 |

以上返回命名空间 ID。render/when 同步运行于只读回调；view 包含 context、query()、store.get()、states.list()。组件取得自己的所属插件 view，props 深只读，不能借组件渲染发命令。以普通条件和数组 map 构造树即可表达条件/列表数据，不在树内建立另一种表达式语言。

宿主页面位置如下，未知名称启动时拒绝，不静默丢失。

| slot | 位置 / context |
| --- | --- |
| menu | 主菜单入口区域；空 context |
| monster.detail | 详情页操作区域；uid |
| monster.content | 详情页数值区之后；uid；蛋详情暂不提供这个区域 |
| bag.actions、bag.content | 原生口袋之后的操作/内容区域；inBattle |
| party.actions、party.content | 原生队伍之后；inBattle |
| shop.actions、shop.content | 原生商品之后；空 context |
| battle.actions、battle.moves、battle.targets | 非忙碌时的主战斗选项、招式选择、目标选择；seat、page、controls |
| party.list | 原生队伍选择区域；inBattle、controls |
| facility.actions、facility.content | 设施页面中原生内容之后；facility 为选中/活动 ID 或 null |

每个区域先展示 entry，再展示 region；各类按 priority 升序及完整 ID 的字典顺序排列，priority 默认为0，范围整数 -1000～1000。默认mode为append，仍然追加；下节列出可替换的原生区域。背包新口袋仍由 inventoryPockets 的领域注册产生，不能由 UI 再造一份库存。

区域不是领域授权：普通插件事务仍受世界/战斗/设施就绪检查，战斗和活动进行中不能用普通 action 绕过它。需要控制这些领域时使用已授权的公共领域命令；页面与只读区域可以查询展示。这个版本没有声明式“任意核心命令按钮”或活动中插件事务新权限。

## 修改原生选择控件

`region.mode`为`append | replace | hide`，只有party.list、battle.actions、battle.moves、battle.targets支持replace/hide。其他slot仍只追加。hide可以不传render；replace必须返回有效布局。页签、HUD和任意DOM不在此合同内。

宿主将原按钮放在独立nativeRoot，把ID、文本及是否禁用作为只读`view.context.controls`提供。插件返回`{kind:"button",native:control.id,text?:...,disabled?:...}`，可调整顺序、标签、主题和布局，但不接收原DOM或回调。native与action/input/submit互斥，只能引用该次挂载提供的句柄；原本禁用的按钮不能被插件启用。点击仍调用原选择/换人/招式/目标逻辑，普通插件事务权限不改变。

稳定入口ID为fight/bag/party/run；队伍为party:<下标>，招式为move:<下标>（增强招式附完整增强ID），目标为target:<席位ID>。优先读取context.controls，不自行推断可用选项；目标不是精灵UID。队伍/招式下标只在当前页面挂载有效。

```js
export const battleLayout = {
  id: "battle-layout", apiVersion: 1, version: "1.0.0", dataVersion: 1,
  permissions: [],
  setup(api) {
    for (const slot of ["party.list", "battle.moves", "battle.targets"])
      api.ui.region(slot, {
        slot, mode: "replace", priority: 10,
        render(view) {
          return {
            kind: "grid", style: { columns: 2, gap: 4 },
            children: view.context.controls.map(control => ({
              kind: "button", native: control.id,
              text: control.label, disabled: control.disabled,
            })),
          };
        },
      });
  },
};
```

将插件模块登记catalog后装配；不需修改app.js。未装插件时原生界面不变。多个replace/hide同时满足when时，选priority最高者；同优先级按完整ID字典序最大者确定。追加region/entry照常显示。当前胜者记录在挂载根的data-native-owner；替换布局或回调报错时报告错误并尝试其他候选，没有成功候选则显示原控件。when变false、页面关闭/重建或区域卸载都会恢复原控件并使旧句柄失效，不把选择句柄保存到插件数据。

真实原战斗命令和生命周期验证见[native-ui-regions.test.js](../../../tests/native-ui-regions.test.js)。这些是宿主DOM端口测试，实际焦点、键盘、触屏和布局需单独实玩验收。当前原战斗方向导航仍按两列选项工作，自定义视觉布局宜保留两列。

## 控件与参数速查

共同属性为 kind、key、text、label、theme、style。key 可选，必须是唯一字母开头标识，供刷新后的草稿/焦点定位。所有树总计最多128个描述节点，深度最多12；组件展开另有相同预算，递归会报错。各 kind 只接受自己的参数，未知属性拒绝。

| kind | 主要参数与行为 |
| --- | --- |
| text、heading | text；显示纯文本 |
| image | src 为已注册资源 ID、alt；可选 action/input/disabled，使图片可点击 |
| canvas | width/height（整数1～512）、visual（presentation.register返回ID）、alt（非空名称）、payload（视觉schema参数）；可选action/input/disabled；每棵树最多16个 |
| button | text，action/input/disabled；原生区域可用native替代action；表单提交按钮改用 submit:true，无 action |
| row、grid、panel、list | children 数组；list 的子项会包成原生 li |
| divider | 分隔线 |
| meter | value/max 有限数，0≤value≤max、max>0；label 为可访问名称 |
| input | value 字符串、name、label、placeholder、maxLength（默认256、可选1～1024） |
| checkbox | value boolean、name、label |
| slider | value/min/max/step 有限数，默认 min=0、step=1；value 在范围内、step>0；提交 number |
| select、radio | options:[{label,value}]，value 为其中的字符串；选项1～32且值唯一；select 可省略初始 value，取首项 |
| tabs | value 为选中页 key；children 为1～16个带唯一 key/label 的面板；原生 tablist/tab/tabpanel，左右箭头及 Home/End 切换 |
| table | columns 为1～8个字符串；rows 最多64行，每行列数一致，单元格为文本或有限数 |
| form | action、input、children、disabled；一次提交全部具名字段，不允许嵌套 form |
| component | component 注册 ID、props 通过该组件 schema；展开后的结果仍要通过完整控件校验 |

字段在 form 内须有唯一 name，不再设置 action；同一表单中隐藏页签的字段也提交当前值。独立字段须有 action，变更提交 `{[name或"value"]:控件值}`。form 提交时将 context、input 固定参数及当前字段按此顺序合并，交给真实命令总线校验；schema 应准确声明宿主 context 字段。任何领域写入仍走 action 的受控事务。

示意树如下；完整生产注册和真实测试见后文，不把这棵树当独立插件。

```js
({kind:"form", action:saveId, children:[
  {kind:"input", name:"title", label:"标题", value:"旅行准备", maxLength:40},
  {kind:"checkbox", name:"pinned", label:"重点", value:false},
  {kind:"slider", name:"goal", label:"目标", value:3, min:0, max:10, step:1},
  {kind:"button", text:"记录", submit:true},
]})
```

## 布局与主题

style 只接受 gap/padding（整数0～32像素）、columns（1～8）、align（start/center/end/stretch）、justify（start/center/end/between）、width（auto/full）、fontSize（8～32）。不接受任意 CSS、HTML、脚本或外部字体 URL。自定义组件可以组合这些原语，Canvas已有通用宿主；尚不能注册任意DOM控件。

主题颜色 background/foreground/border/accent 为六位十六进制；数值 fontSize（8～32）、spacing（0～24）、borderWidth（1～4）、duration（0～1000毫秒）受限。默认像素字体与 reducedMotion 政策保持宿主所有权。duration 传为 CSS token，不意味着所有控件会自动出现动画；具体表现仍走演出接口。

主题继承 CSS 变量；style 对当前节点显式覆盖对应布局。component 节点的共同属性覆盖展开根节点，props 不自动成为 HTML 属性。

## 生命周期与交互

LayoutDOM 只保存临时草稿和页签选择；插件持久数据在 store，由既有保存服务保存。刷新保留同 key/路径的输入值、焦点和文本选择；成功表单提交清理该区域草稿，失败保留。字段提交后显示重新查询的值。

同一控件的异步提交期间锁住再次提交；表单暂时禁用其按钮/字段。页面关闭释放区域引用和草稿，迟到结果不会重新挂载关闭区域或重绘别的新页面。原生编辑控件保留文字/滑杆/选择按键，Esc 可返回；页签自行处理的箭头不再被游戏导航重复处理。

树结构变化时为需要稳定身份的控件设置 key；删除字段或改变定义后的过期草稿不属于存档。区域完整重开会清理草稿。组件声明不能覆盖伤害或库存；渲染错误只隔离页面/区域并记录，不回滚已提交的规则。

## 注册视觉与内嵌 Canvas

`api.presentation.register(id,{duration,loop?,schema?,scope?,draw})` 注册可复用视觉。duration为1～10000毫秒，loop默认false；schema为严格对象schema，省略时只接受空对象。draw同步，签名为 `draw(ctx,frame,assets)`，资源由宿主预加载，以第三参数提供。布局树只引用visual及JSON payload，不能包含draw函数、DOM节点或另起定时器。

frame深冻结，含width/height、payload、view（该页面/区域的context）、elapsedMs、progress、cycle、complete、reducedMotion。循环按duration取模；有限片段结束保留progress=1终帧；缩减动态效果只绘制progress=0静帧。Canvas不取得可写世界或规则RNG，交互仍走action。

挂载的Canvas由LayoutDOM管理，ExtensionDOM在游戏统一帧中驱动；描述校验、纯VisualTimeline时间采样和VisualCanvas绘制各自独立。隐藏页签、隐藏文档或离开DOM不绘制、不累计隐藏时间；显示后从暂停相位继续。整棵页面/区域重建是新挂载，相位重新开始；动画相位不是存档业务数据。页面关闭/替换、区域消失、构建失败及宿主dispose均清理实例，迟到帧不能重画旧节点。关闭模态框不会释放仍显示的HUD Canvas。

有action的Canvas包成原生button，alt为可访问名称；鼠标点击提交 `pointer:{x,y,source:'pointer'}`，坐标为Canvas逻辑像素，随CSS缩放换算，画布外点击不提交。键盘Enter/Space使用中心坐标及source:'keyboard'。合并顺序为context→input→宿主pointer，action schema需声明这些字段；复杂区域命中判断由插件action基于坐标处理。无action时Canvas使用img角色与文本替代，不接管移动输入。

原有 `presentation.play` 与事务 `ctx.feedback` 仍是有限、按scope选择的叠层反馈。二者在播放/提交前验证同一payload schema，循环定义明确拒绝，要求通过有生命周期的Canvas挂载；不提供无人管理的无限叠层。绘制错误恢复Canvas状态、停止出错实例并报告，其他控件继续；异步draw拒绝。插件代码是受信任扩展，公开端口不是任意JavaScript沙箱。

最小完整注册→挂载→互动→保存→关闭例见[plugin-canvas.test.js](../../../examples/plugin-canvas.test.js)，宿主端口夹具仅替代DOM。[核心Canvas测试](../../../tests/plugin-canvas.test.js)验证宿主生命周期，搜索 `Canvas mounts`。当前不附带游戏内画廊插件；浏览器示例按作者指南自行装配。

## 可运行代表例与验证

[表单测试夹具](../../../tests/fixtures/extensions/form.js)在原背包挂入表单、页签与库存表格，通过自有记忆保存字段；[plugin-ui测试](../../../tests/plugin-ui.test.js)验证真实背包页面挂载及交互。它不是运行时插件，也不是原作笔记系统。

[plugin-ui.test.js](../../../tests/plugin-ui.test.js)通过真实插件装配、原生背包页面、声明式 DOM 端口、真实命令/保存，检查类型、写入、库存不变、重载、草稿/焦点、关闭与迟到。DOM 端口不模拟像素布局或真实浏览器事件传播；浏览器实玩在阶段最终验收记录中单独报告。当前状态与证据见[STATUS](../../project/STATUS.md)、[VALIDATION](../../project/VALIDATION.md)。

| 常见错误 | 处理 |
| --- | --- |
| Invalid UI definition: unknown region slot | 从宿主表选择真实名称，不编造新 slot |
| Unknown layout action/component | 使用 register 返回的完整 ID，先注册再引用 |
| Unknown presentation / Invalid layout Canvas | 检查visual完整ID、已注册视觉、尺寸与alt；payload必须匹配该视觉schema |
| Loop presentation requires a mounted Canvas | 不向play/feedback提交循环定义；通过canvas节点挂载，宿主释放 |
| Invalid or duplicate layout form field | 字段须具名、同表单唯一，且不设置独立 action |
| Invalid layout form boundary/button action | 不嵌套表单；submit 按钮只在表单内，无 action |
| Invalid plugin layout expansion budget | 组件递归或树超预算，拆分界面而不是取消限制 |
| Invalid layout style / Invalid theme tokens | 核对允许的属性、单位和范围；不要传任意 CSS |

文件改名时搜索 `resolveLayout`、`class LayoutDOM`、`ui.region`、`formFixture`。接口改动同步公开类型、Skill和对应例；只查改变的边界，不每次重跑未变化的游戏规则。
