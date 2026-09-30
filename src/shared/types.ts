/**
 * 主进程 / 渲染进程共享的类型定义
 */

/** 应用配置（持久化在 config.json，可后期手动修改） */
export interface AppConfig {
  /** 工具显示名称（ImageKit 控制台里 API Key 对应的 Name / 账号标识） */
  name: string
  /** ImageKit Public Key */
  publicKey: string
  /** ImageKit Private Key（敏感，仅保存在本机） */
  privateKey: string
  /** ImageKit URL Endpoint，例如 https://ik.imagekit.io/your_id */
  urlEndpoint: string
  /** 默认上传目录，例如 /uploads */
  defaultFolder: string
  /** 默认标签，逗号分隔 */
  defaultTags: string
  /** 是否自动生成唯一文件名（关闭则同名覆盖） */
  useUniqueFileName: boolean
  /** 并发上传数量 */
  concurrency: number
  /** 界面主题 */
  theme: 'system' | 'light' | 'dark'
  /** 自定义上传端点（ImageKit 私有化 / 代理场景，留空使用官方端点） */
  customEndpoint: string
  /** 自定义管理 API 地址（分区域账号 / 代理场景，留空使用 https://api.imagekit.io/v1） */
  apiEndpoint: string
}

/** ImageKit 上传接口返回结果（只保留用得到的字段） */
export interface UploadResult {
  fileId: string
  name: string
  url: string
  thumbnailUrl?: string
  height?: number
  width?: number
  size?: number
  filePath: string
  fileType?: string
  /** 通过 URL Endpoint 拼接出的访问地址 */
  cdnUrl?: string
}

/** 上传历史条目 */
export interface HistoryEntry extends UploadResult {
  id: string
  uploadedAt: string
  localPath: string
}

/** 添加进队列的本地文件元信息 */
export interface FileMeta {
  path: string
  name: string
  size: number
  type: string
  /** 缩略图（dataURL）或 null */
  thumbnail: string | null
}

/** 单个文件的上传任务状态 */
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'canceled'

/** 上传队列条目（渲染进程维护） */
export interface QueueItem {
  id: string
  path: string
  name: string
  size: number
  type: string
  thumbnail: string | null
  status: UploadStatus
  progress: number
  error?: string
  result?: UploadResult
  /** 用户自定义的远程文件名（留空则使用本地文件名） */
  fileNameOverride?: string
}

/** 发起一次上传请求时的载荷 */
export interface UploadRequest {
  requestId: string
  filePath: string
  fileName?: string
  folder?: string
  tags?: string[]
  useUniqueFileName?: boolean
}

/** 上传进度事件 */
export interface ProgressPayload {
  requestId: string
  loaded: number
  total: number
  /** 'uploading' | 'processing' —— 字节发完后等待服务端返回 */
  phase: 'uploading' | 'processing'
}

/** IPC 统一返回信封 */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** 连通性测试结果 */
export interface TestResult {
  message: string
  fileCount?: number
  /** 根目录下的子目录数量 */
  folderCount?: number
}

/** 运行环境信息 */
export interface AppInfo {
  platform: NodeJS.Platform
  version: string
  electron: string
  configPath: string
  /** 配置文件是否已填写必要凭证 */
  configured: boolean
  userDataDir: string
}

/* ------------------------- 目录浏览 ------------------------- */

/** 目录中的单个条目 */
export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymbolicLink: boolean
  /** 目录为 0 */
  size: number
  type: string
  mtime: number
  hidden: boolean
}

/** 一次列目录的完整结果 */
export interface DirListing {
  path: string
  name: string
  /** 上一级目录，已经是根目录时为 null */
  parent: string | null
  entries: DirEntry[]
  /** 条目过多被截断 */
  truncated: boolean
  /** 磁盘上的实际条目总数（含被截断部分） */
  total: number
}

/** files:describe 的可选项 */
export interface DescribeOptions {
  /** 是否生成缩略图，默认 true */
  thumbnails?: boolean
  /** 最多为前 N 个文件生成缩略图，默认 150 */
  thumbnailLimit?: number
}

/** 路径分类：区分普通文件与目录 */
export interface PathClassification {
  files: string[]
  dirs: string[]
}

/* ------------------------- ImageKit 云端目录 ------------------------- */

/** ImageKit 上的一个目录（子目录） */
export interface RemoteFolder {
  name: string
  /** 完整路径，形如 /mall/home */
  path: string
  createdAt?: string
  updatedAt?: string
  /** 刚在本地创建、服务端索引还没同步（ImageKit 目录是虚拟的，有延迟） */
  pending?: boolean
}

/** ImageKit 上的一个已上传文件 */
export interface RemoteFile {
  fileId: string
  name: string
  /** 完整路径，形如 /mall/header.jpg */
  filePath: string
  /** ImageKit 原始访问地址 */
  url: string
  /** 缩略图地址（ImageKit 媒体库缩略图，仅图片有） */
  thumbnail?: string
  /** image | non-image */
  fileType?: string
  mime?: string
  size?: number
  width?: number
  height?: number
  tags?: string[]
  isPrivateFile?: boolean
  createdAt?: string
  updatedAt?: string
  /** 用 URL Endpoint 拼出的直链 */
  cdnUrl: string
}

/** 云端目录浏览结果（只包含当前这一层） */
export interface RemoteListing {
  /** 当前目录路径，根目录为 "/" */
  path: string
  /** 当前目录名，根目录为 "根目录" */
  name: string
  /** 上一级目录，根目录时为 null */
  parent: string | null
  folders: RemoteFolder[]
  files: RemoteFile[]
  /** 本次文件分页的起点 */
  fileSkip: number
  /** 本次文件分页大小 */
  fileLimit: number
  /** 是否还有更多文件可加载 */
  hasMoreFiles: boolean
}

/** 列出云端目录时的可选参数 */
export interface RemoteListOptions {
  /** 单页文件数量，1-1000，默认 100 */
  fileLimit?: number
  /** 跳过多少条文件（分页） */
  fileSkip?: number
  /** 文件排序，默认 DESC_CREATED（最新上传在前） */
  fileSort?: string
  /** 只取子目录，不请求文件列表 */
  foldersOnly?: boolean
}

