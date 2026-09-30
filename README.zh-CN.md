# ImageKit Uploader

[English](./README.md) · **简体中文**

基于 **Electron + React + Vite + TypeScript** 的 [imagekit.io](https://imagekit.io/) 桌面上传工具，支持 **macOS** 与 **Windows**。

Public Key / Private Key / Name 全部写在工具的**配置文件**里，后期改配置即可生效，不用重新打包。

> 界面默认**英文**，可切换为中文。切换方式见 [切换界面语言](#5-切换界面语言)。

---

## 功能特性

| 能力 | 说明 |
| --- | --- |
| 三种添加方式 | 拖拽文件、点击选择、`⌘/Ctrl + V` 粘贴剪贴板截图 |
| 并发队列 | 默认 3 个并发（可调 1–8），逐文件进度条、失败重试、中途取消 |
| 直接上传 | 主进程内完成 HMAC-SHA1 签名与上传，不依赖任何中转服务 |
| 上传参数 | 目录、标签、唯一文件名，可在界面上按批调整 |
| 本地目录浏览 | 选择本机文件夹，列出其中的子目录与文件，勾选后批量加入队列 |
| 云端目录浏览 | 浏览 ImageKit 上已有的目录与已上传文件（带缩略图），**单击目录即设为上传目标**，双击（或点 `→`）进入该目录 |
| 一键复制 | 复制链接 / Markdown / HTML / 全部链接 |
| 历史记录 | 最近 300 条成功记录，持久化在本地，可复制或删除 |
| 主题 | 深色 / 浅色 / 跟随系统 |
| 语言 | 英文 / 简体中文，**默认英文**，运行时可切换并记住选择 |
| 零密钥外泄 | Private Key 只留在主进程与本机配置文件，渲染进程拿不到 |

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（热更新）
npm run dev

# 3. 生产构建（只编译，不打包安装包）
npm run build

# 4. 打包安装包
npm run build:mac     # → release/*.dmg（Apple Silicon + Intel）
npm run build:win     # → release/*-setup.exe（NSIS 安装包，需在 Windows 上执行）
npm run build:all     # 同时产出 mac + win
npm run build:unpack  # 只产出免安装目录，方便本地验证
```

> 在 macOS 上打 Windows 安装包需要额外安装 Wine，建议直接在 Windows 机器或 CI 上执行 `npm run build:win`。

---

## 配置（Public Key / Private Key / Name）

### 1. 获取凭证

登录 imagekit.io 控制台 → **Developer Options → API Keys**，拿到：

- `Public Key`（形如 `public_xxxxxxxx`）
- `Private Key`（形如 `private_xxxxxxxx`，**属于敏感凭证**）
- `URL Endpoint`（形如 `https://ik.imagekit.io/your_imagekit_id`），在 **URL-endpoints** 页面查看

### 2. 配置文件位置

首次启动会自动生成 `config.json`：

| 系统 | 路径 |
| --- | --- |
| macOS | `~/Library/Application Support/ImageKit Uploader/config.json` |
| Windows | `%APPDATA%\ImageKit Uploader\config.json` |

也可以通过环境变量 `IMAGEKIT_UPLOAD_CONFIG` 指向任意路径，例如把配置放在 U 盘或项目目录里。

### 3. 配置字段

```json
{
  "name": "ImageKit Uploader",
  "publicKey": "public_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "privateKey": "private_xxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "urlEndpoint": "https://ik.imagekit.io/your_imagekit_id",
  "defaultFolder": "/uploads",
  "defaultTags": "",
  "useUniqueFileName": true,
  "concurrency": 3,
  "theme": "dark",
  "customEndpoint": "",
  "apiEndpoint": "",
  "language": "en"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 工具显示名称 / 账号标识，显示在窗口标题栏 |
| `publicKey` | string | ImageKit Public Key |
| `privateKey` | string | ImageKit Private Key，用于生成上传签名 |
| `urlEndpoint` | string | CDN 地址，用于把 `filePath` 拼成最终访问链接 |
| `defaultFolder` | string | 默认上传目录，`/` 表示根目录 |
| `defaultTags` | string | 默认标签，逗号分隔 |
| `useUniqueFileName` | boolean | `true` 时同名文件自动追加后缀，避免覆盖 |
| `concurrency` | number | 并发上传数，1–8 |
| `theme` | `"dark" \| "light" \| "system"` | 界面主题 |
| `customEndpoint` | string | 自定义上传端点，留空使用官方 `upload.imagekit.io` |
| `apiEndpoint` | string | 管理 API 地址，留空使用 `https://api.imagekit.io/v1` |
| `language` | `"en" \| "zh"` | 界面语言，**默认 `"en"`**；填了无法识别的值会回退到英文 |

### 4. 两种修改方式

1. **界面里改**：右上角「设置」→ 填写 → 「保存」；也可以点「保存并测试连接」直接验证凭证是否有效。
2. **直接改文件**：用编辑器打开 `config.json`，保存后回到应用点「设置 → 重新加载配置」即可，无需重启。

模板文件见仓库根目录的 [`config.example.json`](./config.example.json)。

> ⚠️ `privateKey` 等价于账号密码，请勿提交到 Git、也勿随安装包分发。`.gitignore` 已经排除了 `config.local.json` 与 `.env`。

### 5. 切换界面语言

界面内置**英文（默认）**与**简体中文**，三种切换方式效果相同：

| 位置 | 操作 |
| --- | --- |
| 顶栏语言胶囊 | 点主题按钮旁边的语言胶囊（`English` / `简体中文`），立即在两种语言间切换 |
| 设置面板 | 「设置 → 界面 → 语言」，点分段按钮选择 |
| 配置文件 | 把 `language` 改成 `"zh"`，再点「重新加载配置」 |

选择会立刻写入 `config.json`，下次启动沿用。`theme` 与 `language` 属于即时生效项，不需要点保存；设置面板里的其它字段仍需点「保存」。

> 本地化覆盖整个应用——包括主进程抛出的报错、系统文件选择框的标题，以及生成的 `config.json` 顶部的注释说明。注释头会在下次保存时按当前语言重新生成。

---

## 项目结构

```
imageKit-upload/
├── .github/workflows/
│   ├── ci.yml                   # 提交/PR：类型检查 + 三端构建
│   └── release.yml              # 打 tag：出 dmg / exe 并发布 Release
├── build/                       # 打包资源（应用图标等），见 build/README.md
├── electron.vite.config.ts      # 主/预加载/渲染三端构建配置
├── electron-builder.yml         # mac dmg + win nsis 打包配置
├── config.example.json          # 配置模板
├── README.md                    # 英文版（默认）
├── README.zh-CN.md              # 本文件（简体中文）
├── src/
│   ├── shared/
│   │   ├── types.ts             # 主进程与渲染进程共享类型
│   │   └── i18n.ts              # 中英文文案字典 + translate()
│   ├── main/                    # 主进程（Node 侧，持有 Private Key）
│   │   ├── index.ts             # 窗口创建 + 全部 IPC 处理器
│   │   ├── config.ts            # config.json 读写与校验
│   │   ├── lang.ts              # 主进程语言持有者（报错、系统弹窗）
│   │   ├── imagekit.ts          # HMAC-SHA1 签名 + 分片上传 + 连通性测试
│   │   ├── history.ts           # 上传历史持久化
│   │   ├── fs.ts                # 本地目录列举 / 文件收集
│   │   └── mime.ts              # 扩展名 → MIME
│   ├── preload/index.ts         # contextBridge 白名单 API
│   └── renderer/                # 渲染进程（React UI）
│       ├── index.html
│       └── src/
│           ├── App.tsx          # 状态编排 + 并发调度
│           ├── components/      # 顶栏/拖拽区/队列/历史/设置/提示
│           ├── hooks/           # 轻提示、本地与云端目录浏览
│           ├── lib/
│           │   ├── i18n.tsx     # I18nProvider + useT()/useI18n()
│           │   └── ...          # 主题、格式化、剪贴板工具
│           └── styles/index.css # 深浅双主题样式
```

---

## 国际化（i18n）

全部界面文案集中在 **`src/shared/i18n.ts`**：一个扁平的「点分消息键 → 文案」映射。

- `en` 是唯一的事实来源：`MessageKey` 由它推导，`zh` 字典被约束为 `Record<MessageKey, string>`。漏翻或键名写错都会让 `npm run typecheck` 失败，而不是静默回退。
- 占位符写成 `{name}`，由 `translate(lang, key, params)` 替换。
- 渲染层通过 `useT()` / `useI18n()`（`src/renderer/src/lib/i18n.tsx` 的 React Context）取翻译函数；主进程调用 `src/main/lang.ts` 的 `mainT()`，其语言在每次读取 `config.json` 时同步。
- 界面语言同时作用于主进程报错、系统弹窗标题与 `<html lang>`。
- 判断「用户取消」用 `isCanceledMessage()`，它会对所有支持语言的文案做匹配——不要在比较里硬编码某一种语言的字符串。

要新增一门语言：在 `Language` 里加语言码、补 `LANGUAGE_LABELS`，再加一份 `Record<MessageKey, string>` 字典。TypeScript 会把所有待翻译的键列出来。

---

## 上传原理

ImageKit 要求上传请求携带由 Private Key 签名的鉴权参数：

```
token     = 随机 UUID
expire    = 当前时间戳 + 1800 秒
signature = HMAC-SHA1(privateKey, token + expire)
```

请求以 `multipart/form-data` POST 到 `https://upload.imagekit.io/api/v1/files/upload`，字段包含
`file`、`fileName`、`publicKey`、`signature`、`expire`、`token`、`folder`、`tags`、`useUniqueFileName`。

签名与上传都在**主进程**完成，渲染进程只通过 IPC 拿到结果，因此 Private Key 不会进入网页上下文。

---

## 云端目录浏览

「云端目录」标签页直接读取 ImageKit 管理 API（`GET /v1/files?type=all&path=...`），
列出当前目录下的**子目录**与**已上传文件**（图片带缩略图），并且兼任「选上传目录」的入口：

| 操作 | 行为 |
| --- | --- |
| **单击**目录名 | 把该目录设为**本次上传的目标目录**（行会高亮并打上「上传目标」标记，顶部与底部同步显示） |
| **双击**目录名 / 点右侧 `→` | 进入该目录 |
| 面包屑 / 上级 / 根目录 | 纯浏览，不会改动上传目标 |
| 底部「上传到 {当前目录}」 | 一键把**正在浏览的目录**设为上传目标 |
| 顶部「浏览」按钮 | 打开弹窗，在任意位置选中目录作为上传目标 |

目录名比较统一走规范化路径，`/a/`、`/a`、`a` 会被视为同一个目录。
注意 ImageKit 的目录是虚拟的，新建目录后索引有 1~2 秒延迟，界面会自动重试刷新。

---

## 自动化构建（GitHub Actions）

仓库内置两条工作流，都在 `.github/workflows/` 下：

| 工作流 | 触发条件 | 做什么 |
| --- | --- | --- |
| `ci.yml` | 推送到 `main`/`master`、提交 PR、手动 | 在 Ubuntu 上跑 `npm run typecheck` + `npm run build`，验证代码能编译（不打安装包） |
| `release.yml` | 推送 `v*` 标签、手动 | 在 `macos-14` 和 `windows-latest` 上分别打出 dmg / exe；标签触发时自动创建 GitHub Release |

### 发布一个版本

```bash
# 1. 把 package.json 里的 version 改成目标版本（例如 1.0.1）
git commit -am "chore: release v1.0.1"

# 2. 打标签并推送，工作流自动开始打包 + 发布
git tag v1.0.1
git push origin main --tags
```

跑完后在 **Releases** 页面就能看到 `imagekit-upload-1.0.1-arm64.dmg`、
`imagekit-upload-1.0.1-x64.dmg`、`imagekit-upload-1.0.1-setup.exe` 三个产物。

> 工作流会用标签里的版本号覆盖 `package.json` 的 `version`（`npm version ${tag#v}`），
> 所以标签版本和 package.json 不一致时以标签为准。

只想看产物、不发 Release：在 **Actions → Release → Run workflow** 手动触发，
跑完后到该次运行的 Artifacts 区域下载（保留 7 天）。

### 关于签名

当前配置下产物**未做代码签名**（`electron-builder.yml` 里 `identity: null`）：

- **macOS**：首次打开会提示「已损坏」或「无法验证开发者」。右键 →「打开」，
  或执行 `xattr -cr "/Applications/ImageKit Uploader.app"`。
- **Windows**：SmartScreen 会拦一下，点「更多信息 → 仍要运行」即可。

要正式签名，在仓库 **Settings → Secrets and variables → Actions** 里加上
`CSC_LINK`（证书 p12 的 base64）和 `CSC_KEY_PASSWORD`，并把 `electron-builder.yml`
里的 `identity: null` 去掉即可，工作流无需改动。

### 关于依赖源

本地 `.npmrc` 指向 `registry.npmmirror.com`（方便国内开发），CI 跑在境外机器上，
两条工作流都通过 `NPM_CONFIG_REGISTRY` 环境变量临时切回 `registry.npmjs.org`，
不需要改仓库里的 `.npmrc`。

---

## 常见问题

**`npm run dev` 报 `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`**

说明当前终端设置了 `ELECTRON_RUN_AS_NODE`，Electron 被当成普通 Node 启动了。取消该变量即可：

```bash
# macOS / Linux
env -u ELECTRON_RUN_AS_NODE npm run dev

# Windows PowerShell
Remove-Item Env:\ELECTRON_RUN_AS_NODE; npm run dev
```

**上传返回 401 / 403**

Private Key 不正确，或该 Key 没有 Files 权限。到「设置」里点「保存并测试连接」定位问题。

**上传成功但链接点不开**

`urlEndpoint` 没填或填错。填好后重新上传，或在历史记录里复制 `url` 字段（ImageKit 直接返回的地址）。

**Windows 打包失败**

`npm run build:win` 建议在 Windows 本机或 CI 上执行；在 macOS 上交叉打包需要 Wine。

**界面语言没变**

语言是即时生效项，写完配置不会再弹提示。若改的是 `config.json` 文件，记得回应用点一次「设置 → 重新加载配置」；顶栏胶囊与设置面板里的分段按钮则无需任何额外操作。

---

## 技术栈

Electron 33 · React 18 · Vite 5 · TypeScript 5 · electron-vite · electron-builder

## License

MIT
