# build/

[English](./README.md) · **简体中文**

这个目录是 electron-builder 的 `buildResources`（见根目录 `electron-builder.yml`），
用来放打包时需要的图标等资源。目录里没有图标时，electron-builder 会回退到 Electron 默认图标。

## 放什么

| 文件 | 用途 | 尺寸建议 |
| --- | --- | --- |
| `icon.icns` | macOS 应用图标（dmg / .app） | 1024×1024 |
| `icon.ico` | Windows 应用图标（exe / 安装器） | 256×256 起，含多尺寸 |
| `icon.png` | Linux 图标 / electron-builder 自动转换用 | 1024×1024 |
| `background.png` | dmg 安装窗口背景（可选） | 660×400 左右 |

## 怎么生成

最省事的做法是准备一张 1024×1024 的 PNG，然后：

- macOS：`iconutil` 或在线工具把 iconset 转成 `.icns`
- Windows：用 ImageMagick 转 `.ico`
  ```bash
  magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
  ```

放好之后重新执行 `npm run build:mac` / `npm run build:win` 即可生效。
