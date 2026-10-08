# GitHub Pages自动更新

[工作流](../../.github/workflows/checks.yml)在推送、PR和手动触发时检查内容/合同/文档/代码质量、核心覆盖率、插件和工具。只有GitHub默认分支上的推送或手动运行会在检查通过后发布；默认分支从事件元数据读取，不写死main/master。PR和其他分支不发布。部署权限只在发布job授予，使用github-pages环境及部署并发锁；失败保留上一成功网站。

首次在仓库Settings → Pages → Build and deployment中，将Source设为GitHub Actions。以后把代码合入并推送GitHub默认分支即可，Actions的Check and publish Pages显示检查及发布状态。工作流需要进入GitHub仓库；只推送本项目另一个origin远端不会触发GitHub Actions。本轮已通过GitHub API确认默认分支main、Actions已启用，并将Pages的build_type从legacy切换为workflow（204后重新读取确认）；github-pages环境的部署分支允许main。网站地址为https://qiuwji.github.io/pokemon/。本轮没有推送/触发远端运行，网站更新仍须这份工作流进入main后由推送触发；若环境配置了人工审批，仍遵守该仓库环境规则。

[GitHub官方配置说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)定义configure-pages、upload-pages-artifact、deploy-pages及所需pages/id-token权限，不需要额外个人令牌。项目自己的验证使用固定只读原作参考修订。

## 发布文件与验证

[打包工具](../../tools/package-pages.py)把src/和generated/复制到运行器临时目录，仅补根页面的相对跳转与.nojekyll；不生成dist、不转译、不修改源码。根跳转保留query/hash，src/index.html的相对base兼容项目网站路径。仓库外目录须为空；验证运行目录所有入口后才复制，拒绝符号链接及覆盖已有文件。work/、测试、文档、Git配置和依赖目录不发布。工具本地可用python3 tools/package-pages.py --output /临时空目录核对。

CI为每个检出的提交生成独立验证批次及日志，避免本地工作树证据在干净检出上过期阻断发布；历史证据不改写，仍检查日志完整性。日志作为14天Actions artifact保存。CI记录不回推仓库，也不包含在网站中。当前记录格式见[验证工具](EVIDENCE.md)。

本地测试覆盖运行文件边界、子路径模块解析、参数保留和拒绝符号链接/覆盖；它不能证明远端Actions、环境权限及真实部署已经成功。首次推送后应检查publish job的URL，并检查地图/字体/音频请求；本轮遵守用户限制未自动操作游戏。
