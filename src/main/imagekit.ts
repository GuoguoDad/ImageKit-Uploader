import { createHmac, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import https from 'node:https'
import { URL, URLSearchParams } from 'node:url'
import type {
  AppConfig,
  RemoteFile,
  RemoteFolder,
  RemoteListing,
  RemoteListOptions,
  TestResult,
  UploadResult
} from '@shared/types'
import { mimeFor } from './mime'
import { mainLocale, mainT } from './lang'

/** ImageKit 官方上传端点 */
export const DEFAULT_UPLOAD_ENDPOINT = 'https://upload.imagekit.io/api/v1/files/upload'
/** ImageKit 官方管理 API 根地址（列表 / 建目录等） */
export const DEFAULT_API_ENDPOINT = 'https://api.imagekit.io/v1'

/** 签名有效期（秒）。ImageKit 要求不超过 1 小时。 */
const SIGNATURE_TTL_SECONDS = 30 * 60
/** 网络超时（毫秒） */
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
/** 分片写入大小，用于产出平滑的上传进度 */
const CHUNK_SIZE = 128 * 1024

/** 生成 ImageKit 上传所需的鉴权参数：signature = HMAC-SHA1(privateKey, token + expire) */
export function createAuthParams(privateKey: string, ttlSeconds = SIGNATURE_TTL_SECONDS) {
  const token = randomUUID()
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds
  const signature = createHmac('sha1', privateKey).update(token + expire).digest('hex')
  return { token, expire, signature }
}

/** 校验凭证是否齐全，缺失时抛出可读错误 */
function assertCredentials(config: AppConfig): void {
  if (!config.publicKey) throw new Error(mainT('error.missingPublicKey'))
  if (!config.privateKey) throw new Error(mainT('error.missingPrivateKey'))
}

/** URL Endpoint 拼接出最终的 CDN 访问地址 */
export function buildCdnUrl(urlEndpoint: string, filePath: string): string | undefined {
  const base = urlEndpoint.trim().replace(/\/+$/, '')
  if (!base || !filePath) return undefined
  return `${base}${filePath.startsWith('/') ? filePath : `/${filePath}`}`
}

interface MultipartFile {
  name: string
  contentType: string
  data: Buffer
}

/** 手工拼装 multipart/form-data 请求体，便于统计真实的上传字节数 */
function buildMultipart(
  fields: Record<string, string>,
  file: MultipartFile,
  boundary: string
): Buffer {
  const safeName = file.name.replace(/["\r\n]/g, '_')
  const parts: Buffer[] = []

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
        'utf8'
      )
    )
  }

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
        `Content-Type: ${file.contentType}\r\n\r\n`,
      'utf8'
    )
  )
  parts.push(file.data)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'))

  return Buffer.concat(parts)
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: string
  headers: Record<string, string>
  body?: Buffer
  onProgress?: (loaded: number, total: number) => void
  signal?: AbortSignal
}

/** 基于 https.request 的请求封装：支持分片写入、进度回调与中断 */
function request(options: RequestOptions): Promise<string> {
  const { method, endpoint, headers, body, onProgress, signal } = options

  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(mainT('error.canceled')))
      return
    }

    const url = new URL(endpoint)
    const req = https.request(
      {
        method,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        headers
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          const code = res.statusCode ?? 0
          if (code >= 200 && code < 300) {
            resolve(text)
          } else {
            reject(new Error(extractErrorMessage(text, code)))
          }
        })
      }
    )

    const onAbort = (): void => {
      req.destroy(new Error(mainT('error.canceled')))
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const cleanup = (): void => {
      signal?.removeEventListener('abort', onAbort)
    }

    req.on('error', (err) => {
      cleanup()
      reject(err)
    })

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(mainT('error.timeout')))
    })

    if (!body || body.length === 0) {
      req.end()
      return
    }

    let offset = 0
    let lastEmit = 0
    const pump = (): void => {
      while (offset < body.length) {
        const next = Math.min(offset + CHUNK_SIZE, body.length)
        const slice = body.subarray(offset, next)
        offset = next
        const writable = req.write(slice)
        // 限制进度事件频率，避免大文件时刷屏式 IPC
        const now = Date.now()
        if (now - lastEmit > 80 || offset >= body.length) {
          lastEmit = now
          onProgress?.(offset, body.length)
        }
        if (!writable) {
          req.once('drain', pump)
          return
        }
      }
      req.end()
    }
    pump()
  })
}

/** 从错误响应体里提取可读的错误信息 */
function extractErrorMessage(text: string, statusCode: number): string {
  // ImageKit 在凭证错误时返回 403 + "Your account cannot be authenticated."
  if (/cannot be authenticated/i.test(text)) {
    return mainT('error.authFailed')
  }
  try {
    const json = JSON.parse(text) as { message?: string; error?: string; reason?: string }
    const msg = json.message ?? json.error ?? json.reason
    if (msg) return `${msg}${statusCode ? ` (HTTP ${statusCode})` : ''}`
  } catch {
    /* 非 JSON 响应，走下面的兜底 */
  }
  const snippet = text.trim().slice(0, 200)
  if (statusCode === 401) return mainT('error.unauthorized')
  if (statusCode === 403) return mainT('error.forbidden')
  return snippet || mainT('error.requestFailed', { status: statusCode })
}

export interface UploadParams {
  config: AppConfig
  filePath: string
  fileName?: string
  folder?: string
  tags?: string[]
  useUniqueFileName?: boolean
  onProgress?: (payload: { loaded: number; total: number; phase: 'uploading' | 'processing' }) => void
  signal?: AbortSignal
}

/** 上传单个文件到 ImageKit */
export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  const { config, filePath, onProgress, signal } = params
  assertCredentials(config)

  const buffer = await readFile(filePath)
  const localName = basename(filePath)
  const fileName = (params.fileName ?? '').trim() || localName
  const ext = extname(fileName).toLowerCase()

  const auth = createAuthParams(config.privateKey)
  const boundary = `----ImageKitUploader${randomUUID().replace(/-/g, '')}`

  const fields: Record<string, string> = {
    fileName,
    publicKey: config.publicKey,
    signature: auth.signature,
    expire: String(auth.expire),
    token: auth.token,
    useUniqueFileName: String(params.useUniqueFileName ?? config.useUniqueFileName)
  }

  const folder = (params.folder ?? config.defaultFolder ?? '').trim()
  if (folder && folder !== '/') {
    fields.folder = folder.startsWith('/') ? folder : `/${folder}`
  }

  const tags = (params.tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
  if (tags.length > 0) fields.tags = tags.join(',')

  if (config.customEndpoint) fields.endpoint = config.customEndpoint

  const body = buildMultipart(
    fields,
    { name: fileName, contentType: mimeFor(ext), data: buffer },
    boundary
  )

  const endpoint = DEFAULT_UPLOAD_ENDPOINT

  const text = await request({
    method: 'POST',
    endpoint,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
      Accept: 'application/json'
    },
    body,
    signal,
    onProgress: (loaded, total) => {
      // 字节发完之后进入「服务端处理中」阶段
      onProgress?.({ loaded, total, phase: loaded >= total ? 'processing' : 'uploading' })
    }
  })

  const json = JSON.parse(text) as UploadResult & { message?: string }
  if (!json.fileId) {
    throw new Error(json.message ?? mainT('error.uploadNoFileId'))
  }

  return {
    fileId: json.fileId,
    name: json.name ?? fileName,
    url: json.url,
    thumbnailUrl: json.thumbnailUrl,
    height: json.height,
    width: json.width,
    size: json.size ?? buffer.length,
    filePath: json.filePath,
    fileType: json.fileType ?? mimeFor(ext),
    cdnUrl: buildCdnUrl(config.urlEndpoint, json.filePath)
  }
}

/* ========================= 管理 API：云端目录 ========================= */

/** 解析管理 API 根地址：配置里填了 apiEndpoint 就用它（分区域账号 / 代理） */
export function apiBase(config: AppConfig): string {
  const custom = (config.apiEndpoint ?? '').trim().replace(/\/+$/, '')
  return custom || DEFAULT_API_ENDPOINT
}

/** 管理 API 的鉴权头：Basic base64(privateKey:) */
function authHeaders(config: AppConfig): Record<string, string> {
  const credential = Buffer.from(`${config.privateKey}:`).toString('base64')
  return { Authorization: `Basic ${credential}`, Accept: 'application/json' }
}

/** 调用管理 API 并解析 JSON 响应（空响应体返回 undefined） */
async function apiRequest<T>(
  config: AppConfig,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  jsonBody?: unknown
): Promise<T> {
  const body = jsonBody === undefined ? undefined : Buffer.from(JSON.stringify(jsonBody), 'utf8')
  const headers = authHeaders(config)
  if (body) headers['Content-Type'] = 'application/json'

  const text = await request({
    method,
    endpoint: `${apiBase(config)}${path}`,
    headers,
    body
  })

  if (!text.trim()) return undefined as T
  return JSON.parse(text) as T
}

/** ImageKit 列表接口返回的原始条目（文件与目录共用一个结构） */
interface RawAsset {
  type?: string
  name?: string
  filePath?: string
  folderPath?: string
  folderId?: string
  fileId?: string
  url?: string
  thumbnail?: string
  fileType?: string
  mime?: string
  size?: number
  width?: number
  height?: number
  tags?: string[] | null
  isPrivateFile?: boolean
  createdAt?: string
  updatedAt?: string
}

/** 统一云端路径：空 / 根 -> '/'，其余以 / 开头、折叠重复斜杠、去掉尾斜杠 */
export function normalizeRemotePath(input: string): string {
  const raw = String(input ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
  if (!raw || raw === '/') return '/'
  const withLead = raw.startsWith('/') ? raw : `/${raw}`
  return withLead.replace(/\/+$/, '') || '/'
}

/** 云端路径的上一级，根目录返回 null */
export function remoteParent(path: string): string | null {
  const normalized = normalizeRemotePath(path)
  if (normalized === '/') return null
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '/' : normalized.slice(0, index)
}

/** 云端路径的展示名 */
function remoteName(path: string): string {
  const normalized = normalizeRemotePath(path)
  if (normalized === '/') return mainT('common.root')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

/** ImageKit 单次请求允许的最大条数 */
const MAX_API_LIMIT = 1000
/** 多取一条用来判断是否还有下一页，因此上限再减 1 */
const PAGE_LIMIT_MAX = MAX_API_LIMIT - 1
/** 文件默认排序：最新上传在前 */
const DEFAULT_FILE_SORT = 'DESC_CREATED'

function clampLimit(value: number | undefined, fallback = 100): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(PAGE_LIMIT_MAX, Math.max(1, Math.floor(n)))
}

function toRemoteFolder(raw: RawAsset): RemoteFolder | null {
  const path = normalizeRemotePath(raw.folderPath ?? raw.filePath ?? '')
  if (path === '/') return null
  return {
    name: raw.name ?? remoteName(path),
    path,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  }
}

function toRemoteFile(config: AppConfig, raw: RawAsset): RemoteFile | null {
  const filePath = String(raw.filePath ?? '').trim()
  if (!filePath) return null
  const url = String(raw.url ?? '')
  return {
    fileId: String(raw.fileId ?? filePath),
    name: raw.name ?? basename(filePath),
    filePath,
    url,
    thumbnail: raw.thumbnail,
    fileType: raw.fileType,
    mime: raw.mime,
    size: raw.size,
    width: raw.width,
    height: raw.height,
    tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : undefined,
    isPrivateFile: raw.isPrivateFile,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    cdnUrl: buildCdnUrl(config.urlEndpoint, filePath) ?? url
  }
}

/**
 * 列出某个云端目录下的子目录（仅一层）。
 * ImageKit 没有独立的「列目录」接口（旧的 GET /v1/folders 已下线），
 * 统一走 GET /v1/files?type=folder&path=...
 */
export async function listRemoteFolders(config: AppConfig, path: string): Promise<RemoteFolder[]> {
  assertCredentials(config)

  const query = new URLSearchParams({
    path: normalizeRemotePath(path),
    type: 'folder',
    limit: String(MAX_API_LIMIT),
    skip: '0'
  })

  const raw = await apiRequest<RawAsset[]>(config, 'GET', `/files?${query}`)
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item) => item.type === 'folder' || Boolean(item.folderPath))
    .map(toRemoteFolder)
    .filter((folder): folder is RemoteFolder => folder !== null)
    .sort((a, b) => a.name.localeCompare(b.name, mainLocale()))
}

/** 列出某个云端目录下的文件（仅一层，支持分页） */
export async function listRemoteFiles(
  config: AppConfig,
  path: string,
  options: { limit?: number; skip?: number; sort?: string } = {}
): Promise<{ files: RemoteFile[]; hasMore: boolean }> {
  assertCredentials(config)

  const limit = clampLimit(options.limit)
  const skip = Math.max(0, Math.floor(options.skip ?? 0))

  const query = new URLSearchParams({
    path: normalizeRemotePath(path),
    type: 'file',
    sort: options.sort || DEFAULT_FILE_SORT,
    // 多要一条，用来判断后面还有没有数据
    limit: String(limit + 1),
    skip: String(skip)
  })

  const raw = await apiRequest<RawAsset[]>(config, 'GET', `/files?${query}`)
  const items = Array.isArray(raw) ? raw.filter((item) => item.type !== 'folder') : []
  const hasMore = items.length > limit

  const files = items
    .slice(0, limit)
    .map((item) => toRemoteFile(config, item))
    .filter((file): file is RemoteFile => file !== null)

  return { files, hasMore }
}

/** 列出云端目录：子目录 + 已上传文件（一次只列当前这一层） */
export async function listRemoteDirectory(
  config: AppConfig,
  path: string,
  options: RemoteListOptions = {}
): Promise<RemoteListing> {
  const target = normalizeRemotePath(path)
  const fileLimit = clampLimit(options.fileLimit)
  const fileSkip = Math.max(0, Math.floor(options.fileSkip ?? 0))

  const base = {
    path: target,
    name: remoteName(target),
    parent: remoteParent(target)
  }

  // 目录选择器只需要目录，省掉一次文件请求
  if (options.foldersOnly) {
    return {
      ...base,
      folders: await listRemoteFolders(config, target),
      files: [],
      fileSkip: 0,
      fileLimit,
      hasMoreFiles: false
    }
  }

  const [folders, page] = await Promise.all([
    listRemoteFolders(config, target),
    listRemoteFiles(config, target, {
      limit: fileLimit,
      skip: fileSkip,
      sort: options.fileSort
    })
  ])

  return {
    ...base,
    folders,
    files: page.files,
    fileSkip,
    fileLimit,
    hasMoreFiles: page.hasMore
  }
}

/**
 * 在云端目录下新建子目录。
 * 注意：ImageKit 的目录是虚拟的，新建后列表接口有 2~4 秒索引延迟。
 */
export async function createRemoteFolder(
  config: AppConfig,
  parentPath: string,
  name: string
): Promise<RemoteFolder> {
  assertCredentials(config)

  const safe = String(name ?? '').trim()
  if (!safe) throw new Error(mainT('error.folderNameEmpty'))
  if (/[/\\]/.test(safe)) throw new Error(mainT('error.folderNameSlash'))
  if (safe === '.' || safe === '..') throw new Error(mainT('error.folderNameInvalid'))

  const parent = normalizeRemotePath(parentPath)
  await apiRequest<Record<string, never>>(config, 'POST', '/folder', {
    folderName: safe,
    parentFolderPath: parent
  })

  return {
    name: safe,
    path: parent === '/' ? `/${safe}` : `${parent}/${safe}`,
    pending: true
  }
}

/** 用 Private Key 调一次管理 API，验证凭证是否有效 */
export async function testConnection(config: AppConfig): Promise<TestResult> {
  assertCredentials(config)

  const folders = await listRemoteFolders(config, '/')

  const folderNote =
    folders.length > 0
      ? mainT('test.foldersFound', { n: folders.length })
      : mainT('test.noFolders')

  const endpointNote = config.urlEndpoint
    ? mainT('test.endpoint', { url: config.urlEndpoint })
    : mainT('test.noEndpoint')

  return {
    message: `${mainT('test.success')}${folderNote}\n${endpointNote}`,
    folderCount: folders.length
  }
}

/** 文件名工具，便于其它模块复用 */
export const fileNameOf = basename
