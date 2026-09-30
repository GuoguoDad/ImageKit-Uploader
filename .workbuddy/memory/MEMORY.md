# 项目长期记忆：imageKit-upload

## 项目定位
ImageKit.io 桌面上传工具，Electron + React + Vite + TypeScript，目标平台 macOS 与 Windows。

## 关键约定
- 所有 ImageKit 密钥相关操作（签名、上传、连通性测试）**必须在主进程**完成，渲染进程只通过 `src/preload/index.ts` 暴露的白名单 IPC 访问。
- 配置持久化在 `app.getPath('userData')/config.json`，字段变更需同步更新：`src/shared/types.ts` → `src/main/config.ts` 的 `DEFAULT_CONFIG`/`normalize` → 设置界面 → `config.example.json` → README 字段表。
- 主/预加载/渲染三端共享类型统一放在 `src/shared/types.ts`，通过 `@shared/*` 别名导入。
- 界面文案统一使用简体中文；新增组件沿用 `src/renderer/src/styles/index.css` 里的 CSS 变量，不写死颜色（需同时适配 `[data-theme='dark']` 与 `[data-theme='light']`）。
- 云端目录列表遵循文件管理器语义：**单击目录行 = 选中并设为上传目录，双击 / 点 `→` = 进入目录**；任何云端路径比较统一用 `lib/utils.ts` 的 `normalizeRemotePath()`。

## 环境注意事项
- 本机 `~/.npm` 缓存有 root 属主 + 沙箱限制 → 安装依赖统一用 `npm install --cache ./.npm-cache`。
- 本环境预设 `ELECTRON_RUN_AS_NODE=1`，启动/调试必须 `env -u ELECTRON_RUN_AS_NODE`。
- 本机 `ps` / `pkill` 被限制（无法枚举进程）：只能按已知 pid `kill -0` / `kill`。
- 残留的单实例锁 `~/Library/Application Support/ImageKit Uploader/Singleton{Lock,Socket,Cookie}` 会让新实例静默 `app.quit()`，误截到旧窗口 → 启动前先删掉。
- 验证界面改动优先用主进程 `webContents.capturePage()` 存 PNG（抓的是本窗口内容，不受多实例/z-order 影响）；`screencapture` 全屏截图容易被旧实例误导。
- electron-builder 打包要往 `~/Library/Caches/electron/` 写，沙箱会拦，需提权执行。

## CI/CD 约定
- `.github/workflows/ci.yml`：push/PR 只做 typecheck + build，不出安装包。
- `.github/workflows/release.yml`：push `v*` tag 出 dmg（macos-14，arm64+x64）+ exe（windows-latest，nsis）并发 Release；手动触发只产 artifacts。
- 仓库 `.npmrc` 保持 npmmirror（本地开发快）；CI 用 `NPM_CONFIG_REGISTRY` 环境变量覆盖，不改仓库文件。
- 产物文件名统一用 `${name}`（imagekit-upload）而非 `${productName}`，避免空格。
- 未做代码签名（`identity: null`），发布说明里要提示 macOS 右键打开 / Windows SmartScreen。

## 常用命令
```bash
npm run dev          # 开发（需 env -u ELECTRON_RUN_AS_NODE）
npm run typecheck    # 双 tsconfig 类型检查
npm run build        # 三端构建到 out/
npm run build:mac    # 打 dmg
npm run build:win    # 打 nsis（建议在 Windows 上执行）
```
