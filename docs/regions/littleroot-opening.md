# 未白镇序章 · 场景脚本

> 参考：`pret/pokeemerald` @ `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`（只读）
> 坐标 `(x, y)` 为格坐标，原点左上；`z3` = 地面层。朝向写作「上/下/左/右」。
> 台词为原文照抄，`{PLAYER}` 等占位符保留。

---

## 场次进度

原作用一根变量 `VAR_LITTLEROOT_INTRO_STATE` 标记演到哪一步，各场景据此切换演出：

| 值 | 场次 |
| --- | --- |
| 1 | 在搬运车车厢里（男玩家；女玩家为 2） |
| 3 | 刚下车，妈妈迎上来 |
| 4 | 已进屋，被催去调钟 |
| 5 | 上了二楼 / 还没调钟 |
| 6 | 钟调好了 |
| 7 | 看完电视转播，该去见博士 |

另有一根 `VAR_LITTLEROOT_TOWN_STATE`：`1` 见过劲敌 → `2` 去救博士 → `3` 拿到图鉴 → `4` 拿到跑步鞋。

---

## 第一场 · 搬运车里

**落点**：新游戏把玩家放进 `MAP_INSIDE_OF_TRUCK`。坐标由地图中心决定，5×5 的车厢 → **玩家 (2,2)**。

**车内陈设**

| local_id | 坐标 | 朝向 | 说明 |
| --- | --- | --- | --- |
| `LOCALID_TRUCK_BOX_TOP` | (0,0) | 下 | 上方纸箱，颠簸幅度最大 |
| `LOCALID_TRUCK_BOX_BOTTOM_L` | (0,3) | 下 | 左下纸箱，幅度最小 |
| `LOCALID_TRUCK_BOX_BOTTOM_R` | (2,3) | 下 | 右下纸箱 |

车厢内**没有 BGM**。

**纸箱**（(1,0)、(0,1)、(0,2)、(2,3)、(3,4) 五处可查看，内容相同）：

> The box is printed with a POKéMON logo.
> It's a POKéMON brand moving and
> delivery service.

**门在右侧一列 (4,1)(4,2)(4,3)**，外观随剧情变化：

| 时刻 | 外观 |
| --- | --- |
| 刚进图 | 开着、白光 |
| 卡车开动中 | **关着、灰暗** |
| 卡车停稳后 | 开着、白光 |

**节拍**（玩家全程无法操作）

| 拍 | 时长 | 画面 | 音效 |
| --- | --- | --- | --- |
| 1 | 1.5 秒 | 车厢随路面颠簸：三个纸箱上下起伏，镜头同步抖动 | `SE_TRUCK_MOVE` |
| 2 | 2.5 秒 | 淡入 | — |
| 3 | 5 秒 | 卡车停稳 | `SE_TRUCK_STOP` |
| 4 | 1.5 秒 | 开始卸货 | `SE_TRUCK_UNLOAD` |
| 5 | 2 秒 | 车门打开、变亮，解除操作锁定 | `SE_TRUCK_DOOR` |

纸箱的起伏幅度不一样：上方纸箱位移最大，左下最小，右下与上方相同。镜头是整幅上下抖动。

**离车**：玩家走到门前那一列 **(3,1)~(3,3)**，触发出门事件，落到未白镇 **(3,10)**。此事件同时登记若干隐藏关系（女玩家走另一扇门，落到 (12,10)）。

---

## 第二场 · 下车，妈妈迎上来

**落点**：玩家 **(3,10)**，不指定朝向。卡车停在 (2,10)，是两格宽的精灵，玩家此刻视觉上站在车后半截——**跳一格才是下车**。

**广场上的 NPC**

| 对象 | 坐标 | 朝向 | 活动范围 |
| --- | --- | --- | --- |
| 邻居家的小孩 | (16,10) | 徘徊 | 1 × 2 |
| 胖男人 | (12,13) | 徘徊 | 2 × 1（**进场后才出现**） |
| 男孩 | (14,17) | 徘徊 | 2 × 1 |
| 妈妈 | (5,8) | 上 | 静止（**藏在家门后，下面的流程里才现身**） |
| 卡车 | (2,10) | 右 | 进屋后消失 |
| 卡车 | (11,10) | 右 | 另一侧那辆 |
| 劲敌 | (13,10) | 上 | 1 × 1（隐藏） |
| 小田卷博士 | (14,10) | 上 | 1 × 1（隐藏） |

**门口与告示牌**

| 类型 | 坐标 |
| --- | --- |
| 通往 Brendan 家 | (5,8) |
| 通往 May 家 | (14,8) |
| 通往博士研究所 | (7,16) |
| 告示牌 · 镇名 | (15,13) |
| 告示牌 · 研究所 | (6,17) |
| 告示牌 · Brendan 家 | (7,8) |
| 告示牌 · May 家 | (12,8) |

两家门口的牌子按玩家性别显示不同内容：自己家的牌子写「`{PLAYER}` 的家」，邻居家的写「小田卷博士的家」。

**演出**

| # | 动作 | 玩家 | 妈妈 |
| --- | --- | --- | --- |
| 1 | 跳下车 | (3,10) → **(4,10)**，朝右 | 藏在 (5,8) |
| 2 | 开门 | | **现身于门格 (5,8)**，朝上 |
| 3 | 走出家门 | | → **(5,9)**，朝下 |
| 4 | 关门 | | 停下 |
| 5 | 走向玩家 | | → **(5,10)**，转身**朝左** |
| 6 | 说话 | (4,10) 朝右 | (5,10) 朝左 |

此刻**两人并肩面对面**。台词：

> MOM: {PLAYER}, we're here, honey!
>
> It must be tiring riding with our things
> in the moving truck.
>
> Well, this is LITTLEROOT TOWN.
>
> How do you like it?
> This is our new home!
>
> It has a quaint feel, but it seems to be
> an easy place to live, don't you think?
>
> And, you get your own room, {PLAYER}!
> Let's go inside.

| # | 动作 | 玩家 | 妈妈 |
| --- | --- | --- | --- |
| 7 | 一起走向门 | (4,10) → **(5,10)**，转**朝上** | (5,10) → **(5,9)**，朝上 |
| 8 | 开门进屋 | (5,10) → **(5,9)** → **(5,8)** | (5,9) → **(5,8)** 后隐身 |
| 9 | 门在身后关上，玩家被移入屋内 | — | — |

胖男人在玩家进屋这一刻才出现在广场上。

---

## 第三场 · 进门

**落点**：屋内 1F **(8,8)**。楼梯在 **(8,2)**，可自由上下。

**屋内的人**

| local_id | 坐标 | 朝向 | 活动范围 | 备注 |
| --- | --- | --- | --- | --- |
| `LOCALID_PLAYERS_HOUSE_1F_MOM` | (2,6) | 右 | 静止 | 妈妈，随场次换位 |
| `LOCALID_RIVALS_HOUSE_1F_MOM` | (2,7) | 右 | 静止 | 邻居妈妈 |
| `LOCALID_PLAYERS_HOUSE_1F_DAD` | (5,6) | 左 | 1 × 1 | 爸爸 |
| `LOCALID_RIVALS_HOUSE_1F_RIVAL` | (8,8) | 上 | 1 × 1 | 劲敌（隐藏） |
| `OBJ_EVENT_GFX_NINJA_BOY` | (1,5) | 左右徘徊 | 1 × 1 | 劲敌本人（隐藏） |
| `OBJ_EVENT_GFX_VIGOROTH_CARRYING_BOX` | (1,3) | 横向走 | 3 × 0 | 土狼犬，扛着箱子 |
| `OBJ_EVENT_GFX_VIGOROTH_FACING_AWAY` | (4,5) | 原地朝上 | 0 × 0 | 土狼犬 |

**妈妈随场次站位**

| 场次 | 妈妈站位 | 朝向 |
| --- | --- | --- |
| 刚进门 | **(9,8)** | 上（在门口迎人） |
| 还没调钟又跑下楼 | **(8,4)** | 上（在楼梯口） |
| 电视转播 | **(4,5)** | 上（在电视前） |

**迎门演出**

| # | 动作 | 结果 |
| --- | --- | --- |
| 1 | 妈妈在 (9,8) 说话 | 「屋里不错吧？」 |
| 2 | 妈妈转向玩家 | |
| 3 | 玩家原地转身 | 男玩家右转、女玩家左转 |
| 4 | 妈妈继续说 | 「搬运公司的宝可梦搬完还帮忙打扫…你的房间在楼上，记得去调钟！」 |
| 5 | 玩家走进屋里，妈妈原地朝上 | 交还操作权 |

台词：

> MOM: See, {PLAYER}?
> Isn't it nice in here, too?

> The mover's POKéMON do all the work
> of moving us in and cleaning up after.
> This is so convenient!
>
> {PLAYER}, your room is upstairs.
> Go check it out, dear!
>
> DAD bought you a new clock to mark
> our move here.
> Don't forget to set it!

**没调钟就下楼**：玩家又回到 1F 时，妈妈说

> MOM: {PLAYER}.
>
> Go set the clock in your room, honey.

然后**玩家和妈妈一起 `walk_up` 被推回楼上**（到 2F 的 (7,1)）。楼梯本身并没有被封——拦人的是这个"被妈妈推上去"的动作。

**屋内其他人**

| 对象 | 台词 |
| --- | --- |
| 妈妈（有徽章时） | 「哦？爸爸给你徽章了？那妈妈也给你点东西」 |
| 妈妈（默认） | 「别太勉强，亲爱的。随时都可以回家。加油哦，亲爱的！」 |
| 妈妈（拿到图鉴后） | 「你还好吗，{PLAYER}？看起来有点累，去休息一下吧。」 |
| 妈妈（拿到图鉴后） | 「再见啦，亲爱的！」 |
| 妈妈（见过劲敌） | 「你去跟小田卷博士打招呼了吗？」 |
| 妈妈（拿到 PokéNAV） | 「那是什么，亲爱的？PokéNAV？ Devon 的人给的？那把妈妈也登记进去吧」 |
| 土狼犬 A | Fugiiiiih! |
| 土狼犬 B | Huggoh, uggo uggo… |

---

## 第四场 · 上楼调钟

**二楼陈设**

| 坐标 | 内容 |
| --- | --- |
| (7,1) | 楼梯口（通回 1F） |
| (0,1) | 电脑 |
| (1,1) | 日记本 |
| (3,1) | GameCube |
| **(5,1)** | **墙钟** |

另有一个劲敌的精灵球在 (7,1) 附近，平时隐藏。室内有十来个 `LOOK_AROUND` 的装饰品（秘密基地用）。

**上楼时**：玩家踩上 2F，进度从「已催去调钟」推到「已上楼」。

**调钟演出**

| # | 动作 | 结果 |
| --- | --- | --- |
| 1 | 玩家在 (5,1) 与墙钟对话 | 「钟停了呢。得调好它再上弦！」 |
| 2 | 黑屏，进入调钟 | 玩家拨指针把钟调准 |
| 3 | 进度推进到「钟调好了」 | |
| 4 | 两只土狼犬消失 | 它们搬完了箱子 |
| 5 | 妈妈从楼梯口上来 | 走到玩家旁并转身 |
| 6 | 玩家原地转身面对妈妈 | 男玩家右转、女玩家左转 |
| 7 | 妈妈说话 | 「新房间怎么样？」 |
| 8 | 妈妈原路退回上楼离开 | |

台词：

> The clock is stopped…
>
> Better set it and start it!

> MOM: {PLAYER}, how do you like your
> new room?
>
> Good! Everything's put away neatly!
>
> They finished moving everything in
> downstairs, too.
>
> POKéMON movers are so convenient!
>
> Oh, you should make sure that
> everything's all there on your desk.

**妈妈上楼的走位**（男玩家）：从楼梯口 `delay_8` → `walk_down` → 原地左转 → `delay_16` `delay_8` → `walk_left`；离开时 `walk_right` → `walk_up` → `delay_8`。女玩家版左右镜像。

**再次看钟**：只黑屏看一眼，不改进度。

**二楼其他文本**

> {PLAYER} flipped open the notebook.
>
> ADVENTURE RULE NO. 1
> Open the MENU with START.
>
> ADVENTURE RULE NO. 2
> Record your progress with SAVE.
>
> The remaining pages are blank…

> It's a Nintendo GameCube.
>
> A Game Boy Advance is connected to
> serve as the Controller.

**桌上的说明书**：拿到跑步鞋之后（且为男玩家），1F 的 (3,7) 桌上会多出一本书：

> It's the instruction booklet for the
> RUNNING SHOES.
>
> "Press the B Button to run while
> wearing your RUNNING SHOES.
>
> "Lace up your RUNNING SHOES and hit
> the road running!"

---

## 第五场 · 电视里的道馆转播

玩家调完钟、第一次回到 1F 时触发。妈妈已在 (4,5) 面向电视。

| # | 动作 | 结果 |
| --- | --- | --- |
| 1 | 电视「叮」的一声 | `SE_PIN` |
| 2 | 玩家和妈妈各转身 | 都转向电视 |
| 3 | 玩家走到电视前 | 音乐换成采访用的曲子 |
| 4 | 妈妈喊 | 「看！是凯那道馆！爸爸说不定会上镜！」 |
| 5 | 妈妈让开位置，玩家站到电视前 | |
| 6 | 播报道 | 采访者念稿 |
| 7 | 电视关屏，音乐恢复成屋内曲子 | |
| 8 | 玩家转身 | |
| 9 | 妈妈说 | 「啊…结束了。我觉得爸爸在上面，可惜我们错过了。」 |
| 10 | 妈妈说 | 「对了，爸爸有个朋友也住在这镇…他叫小田卷博士，就住隔壁，去打个招呼吧。」 |
| 11 | 妈妈回座 | 进度推进到「该去见博士」 |

台词：

> MOM: Oh! {PLAYER}, {PLAYER}!
> Quick! Come quickly!

> MOM: Look! It's PETALBURG GYM!
> Maybe DAD will be on!

> INTERVIEWER: …We brought you this
> report from in front of PETALBURG GYM.

> MOM: Oh… It's over.
>
> I think DAD was on, but we missed him.
> Too bad.

> Oh, yes.
> One of DAD's friends lives in town.
>
> PROF. BIRCH is his name.
>
> He lives right next door, so you should
> go over and introduce yourself.

**看完之后再看电视**是电影片段：

> There is a movie on TV.
>
> Two men are dancing on a big piano
> keyboard.
>
> Better get going!

---

## 第六场 · 跑步鞋

**前提**：拿到图鉴（`VAR_LITTLEROOT_TOWN_STATE == 3`）。

**触发格**（六个，都在 z3）。妈妈已经在屋外等着，**这是"她找到你"，不是"你找到她"**：

| 玩家踩到 | 妈妈被放到 | 妈妈走来的步数 |
| --- | --- | --- |
| (10,2) | (10,9) | `walk_up` × 6 |
| (11,2) | (11,9) | `walk_up` × 6 |
| (10,9) | 原地 (10,9) | `walk_right` × 4 |
| (11,9) | 原地 (11,9) | `walk_right` × 5 |
| (8,9) | (10,9) | `walk_right` × 2 |
| (9,9) | (11,9) | `walk_right` × 1 |

玩家会同时原地转身：上面两格是朝下转，下面四格男玩家朝左转、女玩家朝右转。

**演出**

| # | 动作 |
| --- | --- |
| 1 | 妈妈说话 |
| 2 | 获得道具的短曲响起，屏幕提示「{PLAYER} 换上了跑步鞋」 |
| 3 | 等短曲放完 |
| 4 | 妈妈说明用法 |
| 5 | 妈妈说第三段 |
| 6 | 妈妈按来路走回家，开门进去，门关上 |
| 7 | 广场上再无妈妈 |

台词：

> MOM: {PLAYER}! {PLAYER}! Did you
> introduce yourself to PROF. BIRCH?
>
> Oh! What an adorable POKéMON!
> You got it from PROF. BIRCH. How nice!
>
> You're your father's child, all right.
> You look good together with POKéMON!
>
> Here, honey! If you're going out on an
> adventure, wear these RUNNING SHOES.
>
> They'll put a zip in your step!

> {PLAYER} switched shoes with the
> RUNNING SHOES.

> MOM: {PLAYER}, those shoes came with
> instructions.
>
> "Press the B Button while wearing these
> RUNNING SHOES to run extra-fast!
>
> "Slip on these RUNNING SHOES and race
> in the great outdoors!"

> … … … … … … … …
> … … … … … … … …
>
> To think that you have your very own
> POKéMON now…\lYour father will be overjoyed.
>
> …But please be careful.
> If anything happens, you can come home.
>
> Go on, go get them, honey!

**跑动的规则**

跑步鞋**不是一件道具**，是两个标记：

| 标记 | 作用 |
| --- | --- |
| `FLAG_RECEIVED_RUNNING_SHOES` | 故事事实：拿到过鞋。屋内的说明书据此出现 |
| `FLAG_SYS_B_DASH` | **能力开关**。全游戏只被上面那场戏写一次 |

跑动判定：

```c
(!(flags & UNDERWATER) && (heldKeys & B_BUTTON) && FlagGet(FLAG_SYS_B_DASH))
```

也就是说——**按住 B 跑动，前提是拿到过跑步鞋**。另外，**室内一律不能跑**（`RS_IsRunningDisallowed` 判 `MAP_TYPE_INDOOR`）。

---

## 附：随时可重新抽取原文

台词与 label 不用手抄，跑这条命令对照：

```sh
python3 tools/import.py script-text \
  --maps LittlerootTown LittlerootTown_BrendansHouse_1F \
          LittlerootTown_BrendansHouse_2F InsideOfTruck \
  --out /tmp/chapter1-opening.json
```
