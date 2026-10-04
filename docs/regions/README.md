# 地区剧情参考

这里按地区记录场景、原文台词、条件分支、角色动作和来源，用于上层绿宝石内容开发。**参考稿不表示对应地区已经实现，也不保证翻译与动作解释均已核实。** 完成度与已知问题统一看 [STATUS](../project/STATUS.md)。

提取者按 [提取与回校验流程](../development/STORY_EXTRACTION.md) 生成来源证据，再写可读场次。固定原作脚本/C及其验证高于手写笔记；原文、中文翻译、项目演绎与待核实内容分别标明。

旧地区稿若撤下，不以聊天记忆补回。使用 `tools/story/extract.py` 从只读参考重新提取。`evidence/<切片>/` 保存可再生成的 packet/source 与人工审阅稿；切片定义放 tools/story/slices，开发进度不放来源文件。

开场使用 [选择配置](../../tools/story/slices/littleroot-opening.json)。其他地区按地图名或完整标签定位 `work/pokeemerald/data/maps/`，复制配置选择范围；没有地区稿也能提取，不凭记忆补文本。
