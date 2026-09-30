import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import type { AppConfig } from '@shared/types'

/** 配置文件名 */
const CONFIG_FILE = 'config.json'

/** 默认配置：后期只需修改 config.json 即可生效 */
export const DEFAULT_CONFIG: AppConfig = {
  name: 'ImageKit Uploader',
  publicKey: '',
  privateKey: '',
  urlEndpoint: '',
  defaultFolder: '/',
  defaultTags: '',
  useUniqueFileName: true,
  concurrency: 3,
  theme: 'dark',
  customEndpoint: '',
  apiEndpoint: ''
}

/** 写入磁盘时的首行说明（读取时会忽略以下划线开头的键） */
const FILE_HEADER: Record<string, string> = {
  _comment:
    'ImageKit 上传工具配置文件。修改后保存，回到应用点击「重新加载配置」即可生效，无需重启。',
  _fields:
    'name=工具显示名 | publicKey / privateKey = ImageKit API Keys | urlEndpoint = CDN 地址 | defaultFolder = 默认上传目录 | apiEndpoint = 管理 API 地址（留空用官方）',
  _privateKeyWarning: 'Private Key 为敏感凭证，请勿提交到 Git 或分享给他人。'
}

/**
 * 配置文件路径。
 * 默认放在系统的用户数据目录；可通过环境变量 IMAGEKIT_UPLOAD_CONFIG 指定其它位置。
 */
export function getConfigPath(): string {
  const override = process.env['IMAGEKIT_UPLOAD_CONFIG']
  if (override && override.trim()) return override.trim()
  return join(app.getPath('userData'), CONFIG_FILE)
}

function stripMeta(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue
    out[k] = v
  }
  return out
}

/** 把任意输入规整成合法的 AppConfig */
export function normalize(input: Partial<AppConfig>): AppConfig {
  const merged: AppConfig = { ...DEFAULT_CONFIG, ...input }
  merged.name = String(merged.name ?? '').trim() || DEFAULT_CONFIG.name
  merged.publicKey = String(merged.publicKey ?? '').trim()
  merged.privateKey = String(merged.privateKey ?? '').trim()
  merged.urlEndpoint = String(merged.urlEndpoint ?? '')
    .trim()
    .replace(/\/+$/, '')
  merged.customEndpoint = String(merged.customEndpoint ?? '').trim()
  merged.apiEndpoint = String(merged.apiEndpoint ?? '')
    .trim()
    .replace(/\/+$/, '')
  merged.defaultFolder = normalizeFolder(String(merged.defaultFolder ?? ''))
  merged.defaultTags = String(merged.defaultTags ?? '').trim()
  merged.useUniqueFileName = Boolean(merged.useUniqueFileName)
  const c = Number(merged.concurrency)
  merged.concurrency = Number.isFinite(c) ? Math.min(8, Math.max(1, Math.floor(c))) : 3
  merged.theme = ['system', 'light', 'dark'].includes(merged.theme) ? merged.theme : 'dark'
  return merged
}

/** 统一目录格式：空 -> '/'，否则以 / 开头 */
export function normalizeFolder(folder: string): string {
  const f = folder.trim()
  if (!f || f === '/') return '/'
  return f.startsWith('/') ? f.replace(/\/+$/, '') || '/' : `/${f.replace(/\/+$/, '')}`
}

function writeConfigFile(config: AppConfig): void {
  const path = getConfigPath()
  mkdirSync(join(path, '..'), { recursive: true })
  const payload = { ...FILE_HEADER, ...config }
  const json = JSON.stringify(payload, null, 2) + '\n'
  const tmp = `${path}.tmp`
  writeFileSync(tmp, json, 'utf8')
  renameSync(tmp, path)
}

/** 首次启动时生成一份带注释的配置文件，方便后期直接编辑 */
export function ensureConfigFile(): AppConfig {
  const path = getConfigPath()
  if (!existsSync(path)) {
    writeConfigFile(DEFAULT_CONFIG)
    return { ...DEFAULT_CONFIG }
  }
  return loadConfig()
}

/** 从磁盘读取配置（读取失败时回退到默认值，不会抛错） */
export function loadConfig(): AppConfig {
  const path = getConfigPath()
  try {
    if (!existsSync(path)) return { ...DEFAULT_CONFIG }
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    return normalize(stripMeta(raw) as Partial<AppConfig>)
  } catch (err) {
    console.error('[config] 读取配置失败，使用默认配置：', err)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 合并并保存配置。
 * 只会覆盖 patch 中出现的字段，未出现的字段保持原值。
 */
export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const current = loadConfig()
  const cleaned = stripMeta(patch as Record<string, unknown>) as Partial<AppConfig>
  const next = normalize({ ...current, ...cleaned })
  writeConfigFile(next)
  return next
}

/** 是否已配置好最小可用凭证 */
export function isConfigured(config: AppConfig): boolean {
  return Boolean(config.publicKey && config.privateKey)
}
