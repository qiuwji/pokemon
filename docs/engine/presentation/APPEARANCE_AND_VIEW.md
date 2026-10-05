# 外观、相机与独立环境层

此合同用于插件组合能力，不在核心实现换装商店、密度明雷、探索迷雾或3D世界。接口为插件 API 1，当前保存格式查 pack.js。相关遇敌合同见[遇敌与接触](../world/ENCOUNTERS_AND_CONTACTS.md)。

## 所有权与名词

- **外观定义**：预先验证的资源图层与具名变体；只描述如何显示对象。
- **选择**：目标身份、定义ID与schema参数；持久选择由AppearanceSelections保存。
- **租约**：可释放的临时覆盖；相机与环境租约只存在于本次运行，重新加载清空。
- **视口**：观察世界的逻辑像素矩形；网格仍为16像素，相机缩放不修改地图或移动规则。
- **环境层**：独立视觉叠层；它既不是逻辑天气，也不是探索可见性状态。

依赖方向：插件注册/命令 → 应用编排 → 通用注册表及所有者 → 只读帧 → Canvas适配器。AppearanceApplication拥有外观选择；ViewApplication组合CameraProfiles、EnvironmentLayers与VisualLeases，后者各自拥有配置与生命周期。CameraRig拥有剧情镜头时序。renderer消费公开帧，不根据物种或移动模式挑资源。

## 外观注册

`api.content.register('appearances', localId, definition)`返回命名空间ID。

| 字段 | 合同 |
| --- | --- |
| name | 非空名称 |
| schema / initialData | 对象参数schema及合法初值，默认空对象 |
| variants | 1–1024个具名配方，每个配方1–16层 |
| defaultVariant | 未提供select时选择的变体，默认default，必须存在 |
| select(data, context) | 可选纯同步函数，返回已有变体名；参数深冻结，不允许命令或事务写入 |

配方支持`layers`、`shadow`（默认true）、`emoteY`（气泡相对脚点偏移）。图层按数组顺序绘制：

| 图层 | 字段 |
| --- | --- |
| actor | `{kind:'actor', actor:已注册图集ID}`；共用朝向、步态、姿态及动画时钟 |
| image | `{kind:'image', resource:已注册资源ID, size:{width,height}, rect?:{x,y,width,height}}` |
| 两者共用 | x/y偏移、opacity（0–1）、bob:{amplitude,periodMs}；bob缩减动态效果时归零 |

image尺寸1–512；偏移绝对值≤512；bob周期80–10000ms、幅度绝对值≤64。资源引用、参数与变体在注册/预览时校验，源裁切越过实际图像尺寸在绘制时明确报错。不存在资源不静默换成其他精灵。图集支持的姿态和静止帧仍按已验证的sprite动画合同；详情页的独立帧播放器见 [资源帧片段](SPRITE_CLIPS.md)，两者使用各自的表现合同。

context含渲染端提供的`actor/species/mode/pose/moving`可选字段；不是可修改的世界对象。衣服和配饰也可注册成有同样方向/姿态帧的透明图集。素材准备属于插件内容工作，本轮未新增素材。

原生`emerald-player`、`emerald-actor`、`emerald-species`也是相同注册表的定义；主角交通图集和物种资源命名由绿宝石包提供。后两者参数分别为`{actor}`和`{species}`。默认定义基于最终合并目录生成，插件物种/图集仍须提供相应真实资源。

Actor模板可声明`appearance:{id,data?}`，此时允许省略actor图集字段。明确提供的actor仍必须存在。换外观不会重建Actor、修改位置、占位预约、物种、属性、招式或移动模式。

## 外观命令和保存

选择目标有三种：`{kind:'player'}`、`{kind:'actor',uid}`、`{kind:'object',map,id}`。Actor UID与个体UID不可混用；场景对象ID允许原生`talk:16,10`形式，不能把持久Actor伪装成object目标。

| 命令 | 输入/结果 |
| --- | --- |
| core.appearance.set | `{target,appearance,data?:JSON字符串}` → `{ok,selection}`；需要appearance权限 |
| core.appearance.clear | `{target}` → boolean；恢复默认，需appearance权限 |
| core.appearance.override | `{target,appearance,data?,priority?,scope?}` → `{ok,token}`；需appearance权限 |
| core.appearance.release | `{token}` → boolean；需appearance权限，允许演出期间释放 |
| core.appearance.preview | `{appearance,data?,context?:JSON字符串}` → 深冻结配方帧；只读不要求权限 |

持久选择在`state.appearances`，当前schema严格验证，缺定义/Actor身份或参数不合法的存档拒绝，原档不覆盖。使用的定义及其资源/图集所有者参与内容依赖。静态对象目标是map+ID选择器，隐藏期间休眠，不复制对象位置或生成第二个对象。重新设置时必须能找到该对象。删除Actor同时释放其选择和覆盖。

临时覆盖priority为整数±10000；同目标同优先级拒绝，最高优先级生效。scope默认visit，离开创建地图清理；session在本次运行保留。保存只保存持久选择，重载清空覆盖；同会话重绑保留令牌序列，旧令牌不能释放新覆盖。

`api.query().appearances`包含冻结的revision、records与overrides。事实事件为`core:appearance-changed/cleared/overridden/released`；表现取样没有随机数或领域写入。set/override的目标不存在返回`{ok:false,reason}`；非法描述、参数或冲突抛错。

## 相机注册、焦点和投影

注册`cameraProfiles`：`{name,columns,rows,zoom?}`。columns/rows为4–100整数，zoom为0.25–4，默认1。绿宝石默认15×10格；实际可见逻辑宽高是columns×16/zoom与rows×16/zoom。该参数不会改变角色每步距离。

| 命令 | 输入/结果 |
| --- | --- |
| core.camera.acquire | `{profile,focus?:{map,x,y},priority?,scope?}` → `{token}`，需camera权限 |
| core.camera.release | `{token}` → boolean，需camera权限，可随时释放 |
| core.camera.view | `{size?:{width,height,raster?}}` → 投影矩形，默认输出画布320×224 |
| core.camera.project | `{point:{x,y},size?}`，世界逻辑像素→画布像素 |
| core.camera.unproject | 同上，画布像素→世界像素；黑边外返回null |

后三者只读，不要求权限。自定义输出尺寸1–8192，与宿主画布尺寸保持一致；浏览器client坐标应先按canvas的DOM矩形换算为画布像素，再调用unproject。这里没有新增世界鼠标行动业务。

焦点必须在合法格子且与当前场景连通，不能观察不相连的房间。无focus时跟随玩家；跨不相连场景后session焦点暂时回到玩家，回原连通场景恢复。相机租约最高优先级生效，同优先级拒绝；visit/session及重载规则与环境一致。

CameraRig的剧情hold/pan优先于插件焦点，follow回到当前有效插件焦点。不同宽高比采用等比缩放和黑边；地图裁切、连接地图可见性、Actor、气泡、天气、环境和照明共享投影，结束野外绘制时恢复Canvas变换，战斗界面保持独立视口。本合同是2D观察范围、聚焦和缩放，不支持真3D透视或任意3D视角。

## 独立迷雾与环境层

注册`environmentLayers`：`{name,visual,schema?,initialData?,opacity?,order?}`。visual引用已有绘制效果，如`weather.fog`、`weather.fog-diagonal`；或引用`api.presentation.effect()`返回值。未知效果启动时拒绝。opacity为0–1，order为整数±10000，默认分别1与0；参数必须匹配对象schema。

`core.environment.acquire({layer,data?:JSON字符串,scope?})`返回token；`core.environment.release({token})`返回boolean。二者需environment权限。visit层离开地图清理，session层保留到释放/重载。多个层可并存，按order及创建顺序稳定绘制；环境层绘制在逻辑天气之后、照明之前，不覆盖逻辑weather数据。`api.query().view`提供当前相机配置及租约列表。

效果draw接收冻结的`{kind,parameters,now,width,height,reducedMotion}`。缩减动态效果的now固定0；绘制异常仍恢复Canvas上下文。绘制器只消费帧，不能通过注册draw函数写游戏规则。

**普通雾效已支持；战争迷雾尚未实现。** 遮挡视线、已探索格记忆、隐藏敌方和目标可选性需要后续独立可见性政策，不能把透明灰层当成探索仓储。完整3D、热卸载、任意渲染宿主亦未提供。

## 实例、测试与排查

[visual-extension](../../../examples/visual-extension.test.js)是27行端到端公开注册/命令/保存示例，安装流程见[作者指南](../../development/AUTHORING.md)。[appearances测试](../../../tests/appearances.test.js)验证身份、图层、权限、持久选择与临时恢复；[view测试](../../../tests/view-extensions.test.js)验证投影/反变换、剧情镜头优先、独立雾层及公开按草格比例选择→地区个体→物种外观组合。比例组合只存在于测试，不是默认安装的明雷玩法插件。

| 报错关键词 | 排查 |
| --- | --- |
| Invalid appearance variant / Unknown selected appearance variant | 图层引用或select输出非法；select只能返回注册的变体 |
| Ambiguous appearance override priority / Ambiguous visual lease priority | 同目标/相机租约优先级冲突；选明确优先级或先释放 |
| Camera focus is in a disconnected scene | 焦点在另一室内/不连通地图；不能靠投影绕过场景边界 |
| Unknown environment visual | 先注册effect并使用返回ID，核对weather.fog点分隔名 |
| Invalid save | 当前外观字段、参数、身份或依赖错误；检查原始数据，不恢复历史格式兼容 |

源码位置变动时搜索`AppearanceSelections`、`CameraProfiles`、`VisualLeases`、`core.camera.acquire`。修改相关生命周期/资源/投影后，复查受影响测试和真实画面；仅修改文档不重跑领域规则。完整验收记录查[VALIDATION](../../project/VALIDATION.md)。


## 浏览器像素输出

PixelDisplay按Canvas实际CSS尺寸及devicePixelRatio设置绘制缓冲，避免先240×160→320×224再由CSS二次放大。Renderer正常无缩放地图使用整数物理像素倍数与居中留边，地块共享边界继续按同一栅格对齐；战斗保持320×224参考坐标并直接绘制到屏幕缓冲。小于原始视口的屏幕仍按比例缩小；显式相机/剧情zoom保持连续，不强制整数化。

公开camera投影默认是所指定surface的数学投影；size.raster:true采用与浏览器Renderer相同的整数放大和像素对齐策略，project/unproject共享它。显式zoom保持连续，Renderer.screenToWorld使用同一投影。对齐不改变通行、遇敌或Actor逻辑范围。resize/pagehide由适配器持有和释放，不建立引擎里的DOM监听。
