# 开发指南

[返回 README](README.md) · [English](development.md)

## 备份当前主题选择

首次安装前，保存 LuCI 配置和原主题路径。以下命令会保留同名的已有备份：

```sh
[ -s /root/luci-theme-before-unifi ] || \
  uci -q get luci.main.mediaurlbase > /root/luci-theme-before-unifi
[ -f /root/luci-config-before-unifi ] || \
  cp -p /etc/config/luci /root/luci-config-before-unifi
```

## 本地预览

在仓库根目录执行，需要 Python **3.9 或更新版本**：

```sh
python3 tools/preview_server.py
```

打开[本地预览](http://127.0.0.1:8765/)。顶部选择器可以切换仪表盘、客户端设备、原生概览、接口、主题设置、登录页和组件；也可直接打开[登录预览](http://127.0.0.1:8765/?page=login)。

预览服务仅监听 `127.0.0.1`，加载主题实际资源和虚构数据，不连接路由器。设置保存只模拟写入浏览器存储，登录预览会阻止凭据提交。按 Ctrl+C 停止服务。

## 开发与构建

### 本地生成 IPK

使用 Python 3.9 或更新版本，在仓库根目录执行：

```sh
python3 tools/build_package.py
```

生成文件位于被 Git 忽略的 `artifacts/`：

- `luci-theme-unifi_0.8.2-1_all.ipk`：可安装的软件包。
- `luci-theme-unifi-rootfs.tar.gz`：安装载荷。
- `manifest.json`：载荷路径、权限和 SHA-256 摘要。
- `SHA256SUMS`：生成的顶层产物校验和。

本地打包器仅依赖 Python 标准库，收录静态资源、LuCI JavaScript 和 ucode 源码，不包含本机二进制。打包成功不代表已经通过目标固件 SDK 验证。

### 使用 OpenWrt SDK 或源码树

将仓库放入 OpenWrt 源码树或 SDK 的 `package/luci-theme-unifi`，并确保 `feeds/luci` 已配置 LuCI feed。在构建配置中选择 `luci-theme-unifi`，随后从 SDK 或源码树根目录执行：

```sh
make package/luci-theme-unifi/compile V=s
```

### 运行测试

单元测试使用 Node.js 内置测试工具，无需安装 npm 依赖。本地验证使用 Node.js **22**：

```sh
node --test tests/*.test.cjs
```

安装 OpenWrt `ucode` 解释器后，可验证后台历史存储：

```sh
ucode tests/activity-store.uc
```

浏览器检查还需要 Playwright 及其 Chromium。可以将依赖安装到本地工具目录：

```sh
npm install --no-save --package-lock=false --prefix ./vendor/browser-tests playwright
./vendor/browser-tests/node_modules/.bin/playwright install chromium
```

在另一个终端保持预览服务运行，然后执行：

```sh
export PLAYWRIGHT_MODULE="$PWD/vendor/browser-tests/node_modules/playwright"
node tests/browser-smoke.cjs
node tests/client-ui-browser.cjs
node tests/settings-browser.cjs
node tests/activity-browser.cjs
node tests/controls-browser.cjs
node tests/tabs-browser.cjs
```

登录页检查另需一个可在开发机运行的 `ucode`：

```sh
UCODE_BIN=/path/to/ucode node tests/login-browser.cjs
```

可通过 `UNIFI_PREVIEW_URL` 和 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定预览地址及浏览器路径。浏览器检查将报告和截图写入 `artifacts/`，不需要路由器凭据。

### 更新厂商数据

生成的 `htdocs/luci-static/resources/unifi/brand-data.js` 已纳入版本管理，普通构建及路由器运行无需下载厂商数据。定义位于 `tools/brand-definitions.json`，来源校验和位于 `research/brand-data-sources.json`。

```sh
python3 tools/generate_brands.py
python3 tools/generate_brands.py --check
```

首次运行会下载源数据至被忽略的 `vendor/brand-data/`。`--check` 仅使用缓存验证，不联网。只有明确更新上游数据时才使用 `--refresh`，并同时审查生成模块、来源记录和许可文件的变化。

### 目录与发布边界

| 路径 | 用途 |
| --- | --- |
| `htdocs/` | 安装到路由器的 CSS、JavaScript、字体与图形素材 |
| `ucode/` | LuCI 页头、页尾和认证模板 |
| `root/` | 主题注册、配置、菜单、ACL 和许可 |
| `preview/` | 本地预览及虚构数据 |
| `tests/` | 单元测试和浏览器检查 |
| `tools/` | 预览、打包及维护工具 |
| `docs/` | 用户与开发文档及预览截图 |
| `research/` | 纳入版本管理的数据来源记录和测试所需样式测量值 |

仅 `htdocs/`、`ucode/`、`root/` 提供路由器安装载荷。下载工具、生成包、原站采集内容、设备备份、实机部署证据及历史本地笔记，均由 [`.gitignore`](../.gitignore) 排除。提交内容和截图中请勿包含真实设备名称、地址、凭据或会话数据。

提交拟发布的代码后，可生成源码压缩包：

```sh
python3 tools/bundle_release.py
```

该工具只归档已经提交的 Git 源码树，并生成独立的源码校验和文件，不收录被忽略的本地采集内容或构建产物。IPK 应与源码包分别分发。

## 贡献与问题反馈

反馈问题时，请提供固件与 LuCI 版本、主题版本、浏览器、视口大小、受影响页面及复现步骤。截图和日志请先移除设备与会话信息。第三方插件布局问题还需提供插件名称与版本。

请让修改范围保持集中，并运行相关检查。共享控件或布局变更应同时检查浅色、深色、桌面和手机宽度。欢迎提供兼容性反馈，请区分本地预览结果与路由器实机结果。

## 恢复与卸载

在 LuCI 中选择之前的主题，或通过 SSH 恢复已备份的主题路径：

```sh
UNIFI_PREVIOUS_THEME="$(cat /root/luci-theme-before-unifi)" &&
  [ -n "$UNIFI_PREVIOUS_THEME" ] &&
  uci set "luci.main.mediaurlbase=$UNIFI_PREVIOUS_THEME" &&
  uci commit luci
rm -f /tmp/luci-indexcache.*
```

如果没有备份，可以切换到作为依赖安装的 Bootstrap：

```sh
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
```

切换离开 Unifi 后，如需卸载：

```sh
opkg remove luci-theme-unifi
```

卸载检查会阻止直接删除正在使用的主题。切换主题不需要重启路由器或网络。

## 主题设置

| 设置 | 可选值 | 默认值 |
| --- | --- | --- |
| 外观模式 | 跟随系统、浅色、深色 | 跟随系统 |
| 客户端每页条数 | 10、25、50、100 | 50 |
| 客户端自动刷新间隔 | 5、10、30、60 秒 | 10 秒 |
| 仪表盘信息刷新间隔 | 1、2、5、10、30、60 秒 | 1 秒 |
| 默认展开导航栏 | 开启、关闭 | 关闭 |
| 总是采样网络活动 | 开启、关闭 | 开启 |

这些设置保存在 `/etc/config/unifi`，适用于所有浏览器。客户端自定义列仍作为浏览器偏好保存。登录页使用独立的固定深色背景。

网络活动每秒采样一次，曲线连续滚动，使用约 1 秒显示缓冲逐步展现已采集的线段。暂停更新、隐藏页面或启用系统“减少动态效果”时停止动画。“系统 → Unifi 主题设置”中的“总是采样网络活动”默认开启，后台持续采集，关闭网页后仍会记录。各接口最近 1 小时的数据只保存在采集进程的内存中；打开或刷新仪表盘时自动恢复历史，随后增量读取，不将流量历史写入闪存。关闭开关会停止采集并释放历史；重启路由器或采集服务也会清空。开关关闭时，仅在仪表盘打开期间采样。系统信息、接口状态和 DHCP 租约按“仪表盘信息刷新间隔”更新，默认 1 秒。

仪表盘和客户端数据采集为只读操作。主题设置权限仅允许写入 `unifi` 配置；原生 LuCI 配置页面继续使用原有写入权限。
