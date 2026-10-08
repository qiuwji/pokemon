# 世界时间与定时任务

## 所有权与政策

`engine/world-clock.js` 保存本地游戏时钟和实际游玩毫秒。引擎不读取 Date、浏览器或随机数；宿主提供 wallNow，游玩时长使用帧的单调时钟。`world-schedule.js` 只管理持久任务截止时间与事实。`application/time-application.js` 协调推进、保存和事件；树果、NPC、库存等规则属于自己的服务。

绿宝石政策：设定家中时钟后开始世界计时；按用户要求以60倍推进（现实1分钟为游戏1小时，游戏一天约24分钟）。这是项目速度政策，不是原作RTC速度。倍率由内容注入，内核默认1倍；自动同步及离线恢复使用同一倍率，显式advance仍按游戏毫秒执行，动画/音频和实际游玩时长不加速。离线时间继续累计，游玩时长只累计前台会话。设置扩展中的“时钟”和卧室原作时钟交互都进入初始设定页，设定只能执行一次。时间页显示第几天、时刻、累计游玩和潮汐。游戏日从设定当天起算，不等同现实日历。浏览器重新载入时恢复已保存的墙钟锚点；电脑时钟倒退时保持高水位，避免重复推进同一区间。

世界时间在对话、战斗、后台仍经过，分钟/每日玩法事实等到野外可处理时发射；原作 PokemonCenter 内推迟时间事件。显式推进使用同一资格检查。通用地图可声明 timeEvents:false。引擎也支持 offline=pause/cap；绿宝石选择 advance。更改时区不改变设定的本地游戏时间。

存档 clock 字段：initialized、localMs、wallMs、playMs、processedMinute、processedDay。schedule：sequence、tasks。保存同步世界时间，不结算被锁住的领域事件；未处理的时间边界随存档保留。重新载入后的首个前台帧建立游玩锚点，离线间隔不加入游玩时长。旧 playSeconds 只是显示镜像，不再通过每秒命令直接增加。

## 公开入口

- 查询 core.query 返回 time 和 schedule 的只读快照；剧情 worldHour/worldMinute/worldDay/clockSet 条件读取保存时间。
- core.time.start {hour,minute}：初始设定。
- content.register("timeTasks", id, {schema?,intervalMs?,catchUp?})：插件声明任务种类。
- core.time.schedule {definition,delayMs,data?}：签发任务，data 为 JSON 字符串；返回稳定 task.N 身份。
- core.time.cancel {id}：取消任务。
- core.time.advance {ms}：显式推进，需要 timeControl 权限；普通任务操作需要 time 权限。
- core:clock-started、core:world-minute、core:world-day、core:time-task：提交后事实，监听参数是事件信封，领域数据在 event.payload。
- NPC 注册行为的只读 context.time/context.environment 支持按时刻/天气决定现有意图。当前不是持久 Actor 仓储或完整作息服务。

任务 schema 与引用在启动/加载时校验，待执行任务声明插件内容依赖。重复任务 catchUp=all 逐次、aggregate 聚合 count、latest 只给最新一次并报告 skipped；每次收集最多 128 个事件，剩余下一帧继续，默认最多 256 个活跃任务。相同截止时间按任务身份稳定排序。每批收集在草稿上执行，计算溢出不损失其他到期任务。

定时事实不等于持久命令队列：收集先提交截止时间变化再通知监听者；监听异常不会自动重试。需要可靠奖励/库存提交的插件，必须通过其命令、幂等业务身份和自己的保存状态处理，不能把事件回调描述成恰好一次的事务。

## 参考与还原边界

只读 work/pokeemerald，修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：src/clock.c 的 InitTimeBasedEvents/DoTimeBasedEvents/UpdatePerDay/UpdatePerMinute；src/time_events.c 潮汐表；src/berry.c 生长与离线推进。

涨潮小时 0–2、9–14、21–23，其他退潮。时间查询和潮汐窗口已验证；潮汐房间切换、原作每日业务/抽奖/商店/树果种植收获尚需业务接线。环境昼夜 tint 的 6/17/20 时分段是本项目表现政策；不用于替代 Gen3 育成白天 12–23、夜间 0–11 的规则。

## 验证证据与失效

world-time 的 14 个场景有针对性通过证据，另有时钟 UI 点击/显示 1 项。覆盖设定、跨日、离线、电脑时间倒退、前台毫秒、任务持久化/补偿/界限/溢出原子性、24 小时潮汐、公开命令、保存、剧情锁、NPC 不可变时间/天气上下文和 PokemonCenter 推迟结算。NPC/cutscene 受影响 19 项一次通过。

此前受影响组合 98 项：96 首次通过；两项分别发现未设定时钟写入 wallMs 导致交易回滚比较不稳定、旧网络测试仍要求伪造游玩秒。修正未设定时钟不读写锚点，并改网络断言为真实帧累计后，仅失败项通过。类型检查通过。新 UI 浏览器操作、完整业务时间循环及全系统回归留待 E。

时钟 schema、wallNow/前后台锚点、事件资格/顺序、任务引用/捕获策略、NPC 上下文或相关公开命令变化时，重查对应证据；无关模块沿用记录。

## 树果时间业务

`game/emerald/domain/crop-growth.js` 的 CropRegistry 校验内容引用，CropService 负责阶段图/剩余分钟/浇水阶段/产量/再生次数/停止生长。阶段名称、时长倍数、循环和离线过期政策从 pack 注入；产量公式独立，服务不接触背包、地图或渲染。替换阶段图可复用同一驱动。

`packs/emerald/berries.js` 使用上述只读 berry.c 规则：planted→sprouted→taller→flowering→ripe；前四阶段各能浇水一次；成熟保持四倍阶段时长，落果后回到 sprouted 并重置浇水；十次再生后消失，一批离线达到 71 倍阶段时长直接消失。产量使用原作 16 位随机数模余和四分之一四舍五入。应用层在 RNG 草稿上推进，成功后提交随机种子；全批树木推进失败不部分写入树状态。

content.register("crops", id, {item,name,durationMinutes,minYield,maxYield})；content.register("berryPlots", id, {map,objectId})。地图 elements 的对应对象声明 kind:"berryPlot"、plotId（限定名）和 actor，按普通静态/补充地图对象合同注册。引用双向启动校验。世界面对该对象时打开树果页面。core.crop.action {id,action:"plant"|"water"|"harvest",kind?} 使用 crops 权限，统一校验当前面对的真实对象、已设时钟、种植库存、成熟和装包资格；浇水需要业务旗标 wailmerPail。提交后发 core:crop-action；时间推进阶段变化发 core:crop-changed。查询 core.query.crops 给出声明土壤的只读视图。

状态 crops.trees 随存档保存；加载校验树的阶段/剩余分钟/水记录/产量及土壤和内容引用，并记录插件依赖。当前内置树果定义为参考确认的橙橙果和樱子果；新增品种只注册定义。原作全部品种、土壤地图对象/初始野生树/见到才解除 stopGrowth、喷壶获得剧情、逐阶段精灵素材、口袋容量政策尚未导入。当前插件测试园地图是验证夹具，没有混入正式绿宝石地图。

crop-growth 10 个场景分别验证四段浇水/成熟/再生/离线/停止/保存/公式/坏数据原子性、替换阶段图、插件公开种植采摘/离线延迟恢复/引用。初次 7 项通过、2 个真实插件场景因夹具误用 professor 资源名而失败；改用现有 ProfBirch 后仅失败项通过。追加离线重绑 1 项通过。受影响架构/应用/插件/网络/UI 共 47 项、时钟应用 3 项通过；新宿主后台帧资格 1 项通过；公开类型检查通过。

树果注册/schema、阶段政策、产量随机数、分钟推进/锁处理、库存/对象交互、保存引用发生变化时对应证据失效；尚未执行浏览器树果素材/布局或最终系统回归。


## 开场调钟界面

`players-house`地区bundle调查墙钟，通过等待式screen进入页面。首次确认提交初始时间，取消不初始化；设置完成才执行妈妈上楼、退出和下一次一楼电视剧情。再次调查只查看已保存时间。页面使用原作wallclock tilemap/男女背景调色板及手针素材，纯WallClockDial负责编辑/取样；UI不能写clock/state。左右调整分针，上下调整小时，触屏按钮/拖动共用同一编辑状态。页面持有资源和输入清理，时钟提交回调仅在此screen寿命内有效。

资源通过`python3 tools/import.py opening-art --check`预演，去掉--check导入；原作只有时针/分针，未虚构秒针。源码来源和用户待验场景见[开场切片](../../regions/LITTLEROOT_OPENING.md)。

钟针灰度输入使用gbagfx的4bpp截断/反色规则，索引PNG保持索引；透明零不能画成黑色方块。AM/PM来自tile128/132，时针按原作十分钟五度步进；偏移表从只读src/wallclock.c提取到packs/emerald/generated/wall-clock.js，再作为资源参数交给纯绘制器。测试包含真实PNG透明像素及不同角度裁切，页面实际观感仍需用户验收。
