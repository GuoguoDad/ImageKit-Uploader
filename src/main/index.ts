import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron'
import { join, basename, extname, isAbsolute } from 'node:path'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type {
  AppConfig,
  AppInfo,
  DescribeOptions,
  DirListing,
  FileMeta,
  HistoryEntry,
  IpcResult,
  PathClassification,
  ProgressPayload,
  RemoteFolder,
  RemoteListing,
  RemoteListOptions,
  TestResult,
  UploadRequest,
  UploadResult
} from '@shared/types'
import {
  ensureConfigFile,
  getConfigPath,
  isConfigured,
  loadConfig,
  saveConfig
} from './config'
import {
  uploadFile,
  testConnection,
  buildCdnUrl,
  createRemoteFolder,
  listRemoteDirectory,
  listRemoteFolders
} from './imagekit'
import { addHistory, clearHistory, loadHistory, removeHistory } from './history'
import { classifyPaths, collectFiles, listDirectory, mapLimit } from './fs'
import { isImageMime, mimeFor } from './mime'

/** 正在进行的上传任务：requestId -> abort 回调 */
const activeUploads = new Map<string, () => void>()

const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'svg',
  'bmp',
  'ico',
  'tif',
  'tiff',
  'heic',
  'heif'
]

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'mkv']
const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]

/** 把异常统一转换成可读文案 */
function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

function fail<T>(err: unknown): IpcResult<T> {
  return { ok: false, error: toMessage(err) }
}

/** 生成缩略图 dataURL（仅图片，尺寸限制在 96px 宽以控制内存） */
async function makeThumbnail(filePath: string, ext: string, size: number): Promise<string | null> {  try {
    if (ext === '.svg') {
      if (size > 512 * 1024) return null
      const raw = await readFile(filePath)
      return `data:image/svg+xml;base64,${raw.toString('base64')}`
    }

    const mime = mimeFor(ext)
    if (!isImageMime(mime)) return null

    const image = nativeImage.createFromPath(filePath)
    if (!image.isEmpty()) {
      return image.resize({ width: 96, quality: 'good' }).toDataURL()
    }

    // 原生解码失败（如部分 webp/avif），小文件退化为直接内联
    if (size <= 1024 * 1024) {
      const raw = await readFile(filePath)
      return `data:${mime};base64,${raw.toString('base64')}`
    }
    return null
  } catch {
    return null
  }
}

/** 读取本地文件元信息，用于渲染进程展示 */
async function describeFile(filePath: string, withThumbnail = true): Promise<FileMeta | null> {
  try {
    if (!isAbsolute(filePath)) return null
    const info = await stat(filePath)
    if (!info.isFile()) return null
    const ext = extname(filePath).toLowerCase()
    return {
      path: filePath,
      name: basename(filePath),
      size: info.size,
      type: mimeFor(ext),
      thumbnail: withThumbnail ? await makeThumbnail(filePath, ext, info.size) : null
    }
  } catch {
    return null
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1160,
    height: 800,
    minWidth: 940,
    minHeight: 620,
    show: false,
    backgroundColor: '#0e1117',
    title: 'ImageKit Uploader',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 18 } : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  win.once('ready-to-show', () => win.show())

  // 页面内的外链一律用系统浏览器打开，避免在应用内导航
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function registerIpc(): void {
  /* ---------------- 配置 ---------------- */

  ipcMain.handle('config:get', (): IpcResult<AppConfig> => ok(loadConfig()))

  ipcMain.handle(
    'config:save',
    (_e, patch: Partial<AppConfig>): IpcResult<AppConfig> => {
      try {
        return ok(saveConfig(patch))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle('config:reload', (): IpcResult<AppConfig> => ok(loadConfig()))

  ipcMain.handle('config:path', (): IpcResult<string> => ok(getConfigPath()))

  ipcMain.handle('config:openFile', async (): Promise<IpcResult<null>> => {
    try {
      const err = await shell.openPath(getConfigPath())
      if (err) throw new Error(err)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('config:revealFile', (): IpcResult<null> => {
    shell.showItemInFolder(getConfigPath())
    return ok(null)
  })

  ipcMain.handle('app:info', (): IpcResult<AppInfo> => {
    const config = loadConfig()
    return ok({
      platform: process.platform,
      version: app.getVersion(),
      electron: process.versions.electron,
      configPath: getConfigPath(),
      configured: isConfigured(config),
      userDataDir: app.getPath('userData')
    })
  })

  /* ---------------- 本地文件 ---------------- */

  ipcMain.handle(
    'files:describe',
    async (_e, paths: string[], options?: DescribeOptions): Promise<IpcResult<FileMeta[]>> => {
      try {
        const withThumbnails = options?.thumbnails !== false
        // 大批量文件只给前 N 个生成缩略图，避免解码上百张图卡住主进程
        const thumbnailLimit = options?.thumbnailLimit ?? 150
        const metas = await mapLimit(paths, 8, (p, index) =>
          describeFile(p, withThumbnails && index < thumbnailLimit)
        )
        return ok(metas.filter((m): m is FileMeta => m !== null))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    'files:pick',
    async (e): Promise<IpcResult<FileMeta[]>> => {
      try {
        const win = BrowserWindow.fromWebContents(e.sender)
        const result = win
          ? await dialog.showOpenDialog(win, {
              title: '选择要上传的文件',
              properties: ['openFile', 'multiSelections'],
              filters: [
                { name: '媒体文件', extensions: MEDIA_EXTENSIONS },
                { name: '全部文件', extensions: ['*'] }
              ]
            })
          : await dialog.showOpenDialog({
              properties: ['openFile', 'multiSelections']
            })

        if (result.canceled || result.filePaths.length === 0) return ok([])

        const metas = await mapLimit(result.filePaths, 8, (p) => describeFile(p))
        return ok(metas.filter((m): m is FileMeta => m !== null))
      } catch (err) {
        return fail(err)
      }
    }
  )

  /* ---------------- 目录浏览 ---------------- */

  ipcMain.handle('fs:pickDirectory', async (e): Promise<IpcResult<string | null>> => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender)
      const result = win
        ? await dialog.showOpenDialog(win, {
            title: '选择要浏览的目录',
            buttonLabel: '选择目录',
            properties: ['openDirectory', 'createDirectory']
          })
        : await dialog.showOpenDialog({ properties: ['openDirectory'] })

      if (result.canceled || result.filePaths.length === 0) return ok(null)
      return ok(result.filePaths[0])
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('fs:listDir', async (_e, dirPath: string): Promise<IpcResult<DirListing>> => {
    try {
      return ok(await listDirectory(dirPath))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(
    'fs:collectFiles',
    async (
      _e,
      payload: { dirPath: string; recursive: boolean; limit?: number }
    ): Promise<IpcResult<string[]>> => {
      try {
        return ok(await collectFiles(payload.dirPath, payload.recursive, payload.limit))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    'fs:classify',
    async (_e, paths: string[]): Promise<IpcResult<PathClassification>> => {
      try {
        return ok(await classifyPaths(paths))
      } catch (err) {
        return fail(err)
      }
    }
  )

  /** 剪贴板里的截图没有本地路径，落盘到临时目录后再上传 */
  ipcMain.handle(
    'files:saveTemp',
    async (_e, payload: { name: string; buffer: ArrayBuffer }): Promise<IpcResult<FileMeta>> => {
      try {
        const dir = join(app.getPath('temp'), 'imagekit-uploader')
        await mkdir(dir, { recursive: true })
        const rawName = basename(payload.name || 'clipboard.png').replace(/["\r\n]/g, '_')
        const ext = extname(rawName) || '.png'
        const target = join(dir, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`)
        await writeFile(target, Buffer.from(payload.buffer))
        const meta = await describeFile(target)
        if (!meta) throw new Error('临时文件写入失败')
        // 临时文件展示时用原始名称，上传时也用原始名称
        return ok({ ...meta, name: rawName })
      } catch (err) {
        return fail(err)
      }
    }
  )

  /* ---------------- ImageKit ---------------- */

  ipcMain.handle('ik:test', async (): Promise<IpcResult<TestResult>> => {
    try {
      const config = loadConfig()
      return ok(await testConnection(config))
    } catch (err) {
      return fail(err)
    }
  })

  /* ---------------- ImageKit 云端目录 ---------------- */

  ipcMain.handle(
    'ik:remoteList',
    async (_e, payload: { path: string; options?: RemoteListOptions }): Promise<IpcResult<RemoteListing>> => {
      try {
        const config = loadConfig()
        return ok(await listRemoteDirectory(config, payload.path, payload.options))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    'ik:remoteFolders',
    async (_e, path: string): Promise<IpcResult<RemoteFolder[]>> => {
      try {
        const config = loadConfig()
        return ok(await listRemoteFolders(config, path))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    'ik:remoteCreateFolder',
    async (
      _e,
      payload: { parentPath: string; name: string }
    ): Promise<IpcResult<RemoteFolder>> => {
      try {
        const config = loadConfig()
        return ok(await createRemoteFolder(config, payload.parentPath, payload.name))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle('ik:upload', async (e, req: UploadRequest): Promise<IpcResult<UploadResult>> => {
    const sender = e.sender
    const controller = new AbortController()
    activeUploads.set(req.requestId, () => controller.abort())

    const emit = (payload: ProgressPayload): void => {
      if (!sender.isDestroyed()) sender.send('ik:progress', payload)
    }

    try {
      const config = loadConfig()

      const result = await uploadFile({
        config,
        filePath: req.filePath,
        fileName: req.fileName,
        folder: req.folder,
        tags: req.tags,
        useUniqueFileName: req.useUniqueFileName,
        signal: controller.signal,
        onProgress: ({ loaded, total, phase }) =>
          emit({ requestId: req.requestId, loaded, total, phase })
      })

      const entry: HistoryEntry = {
        ...result,
        id: req.requestId,
        uploadedAt: new Date().toISOString(),
        localPath: req.filePath,
        cdnUrl: result.cdnUrl ?? buildCdnUrl(config.urlEndpoint, result.filePath)
      }
      addHistory(entry)

      return ok(result)
    } catch (err) {
      return fail(err)
    } finally {
      activeUploads.delete(req.requestId)
    }
  })

  ipcMain.handle('ik:cancel', (_e, requestId: string): IpcResult<null> => {
    const abort = activeUploads.get(requestId)
    if (abort) abort()
    return ok(null)
  })

  /* ---------------- 历史记录 ---------------- */

  ipcMain.handle('history:list', (): IpcResult<HistoryEntry[]> => ok(loadHistory()))
  ipcMain.handle('history:clear', (): IpcResult<HistoryEntry[]> => ok(clearHistory()))
  ipcMain.handle(
    'history:remove',
    (_e, id: string): IpcResult<HistoryEntry[]> => ok(removeHistory(id))
  )

  /* ---------------- 系统能力 ---------------- */

  ipcMain.handle('shell:openExternal', async (_e, url: string): Promise<IpcResult<null>> => {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('仅支持打开 http/https 链接')
      await shell.openExternal(url)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('shell:showItem', (_e, path: string): IpcResult<null> => {
    if (isAbsolute(path)) shell.showItemInFolder(path)
    return ok(null)
  })

  ipcMain.handle('app:openUserDataDir', async (): Promise<IpcResult<null>> => {
    try {
      const err = await shell.openPath(app.getPath('userData'))
      if (err) throw new Error(err)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })
}

// 单实例：避免重复打开导致配置/历史互相覆盖
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  void app.whenReady().then(() => {
    // 首次启动生成 config.json，方便用户后期直接编辑
    ensureConfigFile()
    registerIpc()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
