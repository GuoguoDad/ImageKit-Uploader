# build/

**English** · [简体中文](./README.zh-CN.md)

This directory is electron-builder's `buildResources` (configured in the root `electron-builder.yml`)
and holds assets such as icons used during packaging. If no icon is present here,
electron-builder falls back to the default Electron icon.

## What goes here

| File | Purpose | Recommended size |
| --- | --- | --- |
| `icon.icns` | macOS app icon (dmg / .app) | 1024×1024 |
| `icon.ico` | Windows app icon (exe / installer) | 256×256 or larger, multi-size |
| `icon.png` | Linux icon / source for electron-builder conversion | 1024×1024 |
| `background.png` | dmg installer window background (optional) | around 660×400 |

## How to generate them

The simplest path is to prepare a single 1024×1024 PNG, then:

- macOS: convert an iconset to `.icns` with `iconutil` or an online tool
- Windows: convert to `.ico` with ImageMagick
  ```bash
  magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
  ```

Once the files are in place, re-run `npm run build:mac` / `npm run build:win` to pick them up.
