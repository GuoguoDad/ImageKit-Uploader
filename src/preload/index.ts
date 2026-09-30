import { contextBridge, ipcRenderer, webUtils } from 'electron'
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

/** 暴露给渲染进程的白名单 API，渲染进程无法直接触碰 Node / Electron */
const api = {
  config: {
    get: (): Promise<IpcResult<AppConfig>> => ipcRenderer.invoke('config:get'),
    save: (patch: Partial<AppConfig>): Promise<IpcResult<AppConfig>> =>
      ipcRenderer.invoke('config:save', patch),
    reload: (): Promise<IpcResult<AppConfig>> => ipcRenderer.invoke('config:reload'),
    path: (): Promise<IpcResult<string>> => ipcRenderer.invoke('config:path'),
    openFile: (): Promise<IpcResult<null>> => ipcRenderer.invoke('config:openFile'),
    revealFile: (): Promise<IpcResult<null>> => ipcRenderer.invoke('config:revealFile')
  },

  app: {
    info: (): Promise<IpcResult<AppInfo>> => ipcRenderer.invoke('app:info'),
    openUserDataDir: (): Promise<IpcResult<null>> => ipcRenderer.invoke('app:openUserDataDir')
  },

  files: {
    pick: (): Promise<IpcResult<FileMeta[]>> => ipcRenderer.invoke('files:pick'),
    describe: (
      paths: string[],
      options?: DescribeOptions
    ): Promise<IpcResult<FileMeta[]>> => ipcRenderer.invoke('files:describe', paths, options),
    saveTemp: (name: string, buffer: ArrayBuffer): Promise<IpcResult<FileMeta>> =>
      ipcRenderer.invoke('files:saveTemp', { name, buffer }),
    /** 拖拽进来的 File 对象 -> 本地绝对路径 */
    pathForFile: (file: File): string => webUtils.getPathForFile(file)
  },

  /** 目录浏览相关能力 */
  fs: {
    /** 弹出系统目录选择器，取消时返回 null */
    pickDirectory: (): Promise<IpcResult<string | null>> =>
      ipcRenderer.invoke('fs:pickDirectory'),
    /** 列出目录内容 */
    listDir: (dirPath: string): Promise<IpcResult<DirListing>> =>
      ipcRenderer.invoke('fs:listDir', dirPath),
    /** 收集目录下的文件路径（可递归） */
    collectFiles: (payload: {
      dirPath: string
      recursive: boolean
      limit?: number
    }): Promise<IpcResult<string[]>> => ipcRenderer.invoke('fs:collectFiles', payload),
    /** 把一批路径分成文件与目录 */
    classify: (paths: string[]): Promise<IpcResult<PathClassification>> =>
      ipcRenderer.invoke('fs:classify', paths)
  },

  ik: {
    test: (): Promise<IpcResult<TestResult>> => ipcRenderer.invoke('ik:test'),
    upload: (req: UploadRequest): Promise<IpcResult<UploadResult>> =>
      ipcRenderer.invoke('ik:upload', req),
    cancel: (requestId: string): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('ik:cancel', requestId),

    /** 列出云端目录（子目录 + 已上传文件，只列当前一层） */
    listRemote: (payload: {
      path: string
      options?: RemoteListOptions
    }): Promise<IpcResult<RemoteListing>> => ipcRenderer.invoke('ik:remoteList', payload),
    /** 只列云端子目录（目录选择器用） */
    listRemoteFolders: (path: string): Promise<IpcResult<RemoteFolder[]>> =>
      ipcRenderer.invoke('ik:remoteFolders', path),
    /** 在云端新建子目录 */
    createRemoteFolder: (payload: {
      parentPath: string
      name: string
    }): Promise<IpcResult<RemoteFolder>> => ipcRenderer.invoke('ik:remoteCreateFolder', payload),

    onProgress: (listener: (payload: ProgressPayload) => void): (() => void) => {
      const handler = (_e: unknown, payload: ProgressPayload): void => listener(payload)
      ipcRenderer.on('ik:progress', handler)
      return () => {
        ipcRenderer.off('ik:progress', handler)
      }
    }
  },

  history: {
    list: (): Promise<IpcResult<HistoryEntry[]>> => ipcRenderer.invoke('history:list'),
    clear: (): Promise<IpcResult<HistoryEntry[]>> => ipcRenderer.invoke('history:clear'),
    remove: (id: string): Promise<IpcResult<HistoryEntry[]>> =>
      ipcRenderer.invoke('history:remove', id)
  },

  shell: {
    openExternal: (url: string): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('shell:openExternal', url),
    showItem: (path: string): Promise<IpcResult<null>> =>
      ipcRenderer.invoke('shell:showItem', path)
  }
}

export type RendererApi = typeof api

contextBridge.exposeInMainWorld('api', api)
