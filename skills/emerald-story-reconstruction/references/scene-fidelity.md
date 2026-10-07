# 演员、界面和异步演出的专项核对

只读取本任务涉及的小节；流程及验收分支见[执行工作单](execution-workbook.md)。

## 原作界面、文字与演出


涉及菜单布局、sprite/文字坐标或音效时先读[界面实施与来源](../../../docs/development/EMERALD_UI.md)。先追原C的window templates、CreateSprite、tilemap/palette及资源build规则，再使用tools/ui/export-theme.py导出；不得以整个场景截图代替网格地图。页面落在对应*-interface.js，纯格式化在ui/；规则依旧通过现有命令执行。

NPC对白逐字、告示牌/家具查看即时显示：在内容中明确mode，不在UI按名字猜。捕捉结果由领域先决定，表现等待摇晃/挣脱结束再宣布；音效由一次性的时间点触发，不能放入每帧sample/draw。四次捕捉判定成功不等于播四次摇晃。统一确认入口已负责音效，页面回调不要重复播放。扩展原生区域、关闭资源生命周期和reduced-motion必须保留。

针对性检查可用node --test tests/native-pages.test.js tests/ui-composition.test.js tests/presentation.test.js；文件改名搜索summaryPage、Capture announces、First field confirm。导出后先--check，应无差异；可执行检查只证明代码与资源合同，不证明像素/听感一致。浏览器或Computer Use仅按当次用户授权执行；用户承担端到端时明确留待验项。

详情sprite用`python3 tools/import.py detail-sprites --check`预演，去掉`--check`导入真正的anim_front.png和normal.pal。front.png可能包含黑色VRAM预留槽，不能按高度生成动画帧。原生详情播放一次并返回首姿态，插件clip仍可循环；参数和资源归属见导入索引。

队伍图标使用原作共享icon调色板，由pixel_assets.py解析pokemon_icon.c/graphics.c，不是物种normal.pal；detail-sprites同时修复已导入图标。别用CSS滤镜掩盖导入偏色。

## 角色与动作转写的现有落点


- 原作演员业务数据放native-cast-data.js / opening-objects.js，native-cast.js只作通用条件投影；唯一身份绑定放native-object-bindings.js。使用来源local ID或严格唯一坐标，未知/歧义明确报错，不以静止朝下兜底。条件入图站位用placement，在来源绑定后、目的地首帧前生效，不让延迟mapEnter补丁造成闪现。初始朝向核对native-movement.js的原作表，LEFT_AND_RIGHT与RIGHT_AND_LEFT不同，不能按子串猜。
- local ID存在不等于绑定正确：逐角色核对原表的script、graphics_id、坐标、movement_type与范围，并覆盖男女镜像分支。隐式ID按完整原表序号计算，不能按筛选后演员列表编号；例如邻居孩子是6，3属于搬家过动猿。定向WANDER必须保留方向集合，不能当四方向漫步。至少验证一次移动及重入，不能只断言对象能创建。
- 统一入口`python3 tools/story/extract.py movement --packet <packet> --label <label> --actor <稳定ID> --map <地图>`先回校验固定来源，再调用tools/story/movement.py输出source锚点和commands。完整调用与支持范围见[提取流程](../../../docs/development/STORY_EXTRACTION.md)；未知指令先查C语义，再补局部映射/接口，不删除步骤。
- applymovement并行关系仍由作者写parallel/sequence；跟随或推回可显式声明ignoreActors，只忽略指定演员的占位，保留地形/高度/边界。锁朝向用keepFacing，不用逐格插face冒充原作锁。别把例外带入正常玩家移动。
- 会在本场戏改变资格flag的演员须在变化前获得场景pin，否则实时projection可能在行走前重置它。OnTransition摆位宜用入图visit patch；临时对白分支变量在入图重置。原作一次性图鉴与赠球分开记账，不能因赠球满包扣住主线。
- 连续同选项移动可合并为path，共用对白/门动作以call复用；各方向不同的路线留在内容中。不要为了压缩JSON把剧情转回巨型JS条件函数。
- 核准演员结束位置时同时记录本次访问、重入、存读档：阶段常驻位置用projections，本次访问的行走终点用visit对象覆盖，不把NPC缓存当存档。核准原作临时寿命，勿为“恢复位置”一律写永久patch。
- mapEnter中的纯摆位/临时变量初始化由map-setup.js识别，保留正在按住的方向/跑步输入；对白、移动演出与战斗仍接管。新增命令不默认归入初始化白名单。原作剧情曲需覆盖跨对白持续、读档重建及战斗入场优先级，不能只在一个music命令中短暂播放。

## 常见错误与排查


| 报错关键部分 | 原因与处理 |
| --- | --- |
| Story region outside map: | where使用未注册map或矩形越界；查目录键与实际width/height |
| events.<id>: unknown prerequisite | after引用缺失事件；<id>为实际ID，跨插件使用注册返回值 |
| Story dependency cycle at | 事件前置环；重画状态图，不通过删除校验继续运行 |
| Unknown story command: | C命令名被直接当JS命令或拼错；按StoryApplication.handlers/CommandRunner现有合同映射 |
| Scripted actor movement blocked: | 路径碰撞/高度/角色预约不合法；核对方向分支及实际grid，不用teleport绕开 |

Unknown story script/dialogue意味着局部引用拼错或依赖包未装配；Story call cycle拒绝递归；Stable story node required要求持久脚本每个分支有稳定node；Story state namespace denied检查owner前缀。未知读档节点不得删校验强行恢复。

奖励容量失败保留具体reason，修正剧情分支而不关容量策略。choice.cancel必须是options中的ID；界面返回未知选项会报Invalid story choice result。若检索不到错误全文，查关键部分和对应校验器，错误路径会随命令树层级变化。

## 原作对象与异步演出的易错边界


先区分OnTransition摆位与可见applymovement：前者在入图安排位置，不能因为中途var/flag改变就让实时projection把人物瞬移。相邻中间状态保持同一摆位，需变化的位置通过移动命令或明确的下一次入图条件表达。原生对象有显式或隐式local ID；后者是来源object_events的1起始序号，男女地图顺序不一定相同。绑定须核准来源身份及图形帧，不能拿坐标或通用宝可梦静态图冒充角色动画。

坐标脚本可能就在门格上，应先让step脚本处理已落地位置再决定warp；核对正常走路、脚本移动忽略自动warp和取消/重入三种路径。演出移动必须按实际时钟等到结束，模拟异步界面/帧刷新时也应保持NPC pin身份；不能只用同步递增时钟的最终坐标测试证明无锁死。

页面special必须规定打开、确认/取消、关闭及回调过期。当前clock screen返回confirmed/cancelled/viewed，提交回调由故事生命周期授权；页面和动画不直接改clock，淡入淡出不能阻断自己已授权的提交。原作时钟图块和门帧再生成见[opening-art导入](../../../docs/development/IMPORT_SCRIPTS.md)，流程为grid→opening-art；帧素材与姿态复用既有注册合同，不在引擎写地图/角色名分支。

用户若要求自行端到端验收，就仅修代码及授权的代码测试，交付可执行的画面/听音清单并标为待用户验证，不再使用Computer Use操作其游戏。当前切片落点与已知演绎集中在[地区切片](../../../docs/regions/LITTLEROOT_OPENING.md)，实际进度仍读取STATUS。

## 长剧情接手时的具体约束


声明durable:true后，用稳定node而不是数组下标描述检查点。battle前保存ready游标，onResult接确定结果后自动续接；不能把未声明durable的短battle当作等待命令。checkpoint只在演员/领域操作稳定完成处使用；不能放parallel，嵌套公共流程用call，不再创建script会话。保存不包含动画时钟、DOM或战斗中间态。

新增切片至少验证真实入口→参数化公共对白→领域成功/满包→重入，以及长剧情的战斗后续接或失败重载。恢复节点改名须明确开发存档失效；不得为了兼容未发布旧节点增加散落回退。实际测试参考story-content.test.js、story-session.test.js，路径改名搜索`Stable story checkpoints`、`Battle receipts are correlated`。

本地化写对白目录；多角色用每句name/portrait/expression，插值声明bindings，条件台词用入口requires/if而非播放器读状态。记录只收最终确认dialog及已选项，历史回看不触发奖励。内容来源保持原作确认/项目演绎/pending三类，不能把换了数据格式当作原作完整还原。

接手调钟或其他special后续剧情时，检查“旧任务已完成、新任务尚未解锁”的空隙；侧栏必须支持无当前任务，不能让进度查询导致启动失败。原作4bpp灰度PNG不等同于索引PNG：复用tools/imports/pixel_assets.py的gbagfx截断/反色语义，验证透明背景及帧裁切；只检查图像尺寸不证明素材正确。

入口地毯/箭头warp依据所在格及下一次向外输入，不是落格立即传送；进入房子必须核对真实落点，不能以相邻可行走格替换而令演员路线偏一格。跨男女/家中的projection必须同时限定地图和性别；同名角色不存在时，不得删除严格校验来隐藏内容错误。战后演员先pin，再写已胜奖励，保留对白/逐步离场，最后hide。新增可获物品用成功分支的明确对白、fanfare及waitSound，满包不得宣称获得。

原作战斗转场选择在battle_setup.c，逐帧机制在battle_transition.c。现有packs/emerald/battle-transitions.js接开场正常地形四种选择，描述与纯采样/绘制分开；generic TransitionController只管理遮盖时序与提交，不放原作表。扫描线硬件/调色板混合与Canvas非等价，不得以单测声称逐像素一比一。相机正常默认15×10格，插件仍可配置视口。


## 重复访问与救援追逐


地区数据的落点见[代码地图](../../../docs/development/CODE_MAP.md)。Route101入场必须匹配原coord_events的(10/11,19)，玩家四步向上后朝左；演员初始化、三段完整绕圈及最终相对朝向依据原movement数组，不能用通用寻路代替。选取证据可使用tools/story/slices/route101-rescue.json，移动转换器支持walk_in_place_fast并保留原8帧等待；本次匹配依赖只读固定参考，不让核心测试依赖work目录。

区分重复访问三种所有者：普通地图对象按新访问重新装配，visit覆盖过图清理，持久Actor按自身存储恢复。不能用NPC渲染缓存保存长期摆位。重复的拦路/催促事件先核对原动作是否只是face，不把原地转向写成走一格。至少验证第二次触发和中间存读档后的入口；检查目标站位与输入锁一起恢复，不通过忽略所有碰撞或删除事件解决卡住。
