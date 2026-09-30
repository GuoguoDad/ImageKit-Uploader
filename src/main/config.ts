import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { DEFAULT_LANGUAGE, normalizeLanguage, translate } from '@shared/i18n'
import type { AppConfig } from '@shared/types'
import { setMainLanguage } from './lang'

/** 配置文件名 */
const CONFIG_FILE = 'config.json'

/** 默认配置：后期只需修改 config.json 即可生效（默认英文） */
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
  apiEndpoint: '',
  language: DEFAULT_LANGUAGE
}

/** 写入磁盘时的首行说明（读取时会忽略以下划线开头的键，语言跟随配置） */
function fileHeader(lang: AppConfig['language']): Record<string, string> {
  return {
    _comment: translate(lang, 'configFile.comment'),
    _fields: translate(lang, 'configFile.fields'),
    _privateKeyWarning: translate(lang, 'configFile.privateKeyWarning')
  }
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
  merged.language = normalizeLanguage(merged.language)
  // 主进程的报错文案 / 系统弹窗也跟随界面语言
  setMainLanguage(merged.language)
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
  const payload = { ...fileHeader(config.language), ...config }
  const json = JSON.stringify(payload, null, 2) + '\n'
  const tmp = `${path}.tmp`
  writeFileSync(tmp, json, 'utf8')
  renameSync(tmp, path)
}

/** 兜底配置（顺便把主进程语言同步成默认值） */
function fallbackConfig(): AppConfig {
  setMainLanguage(DEFAULT_CONFIG.language)
  return { ...DEFAULT_CONFIG }
}

/** 首次启动时生成一份带注释的配置文件，方便后期直接编辑 */
export function ensureConfigFile(): AppConfig {
  const path = getConfigPath()
  if (!existsSync(path)) {
    writeConfigFile(DEFAULT_CONFIG)
    setMainLanguage(DEFAULT_CONFIG.language)
    return { ...DEFAULT_CONFIG }
  }
  return loadConfig()
}

/** 从磁盘读取配置（读取失败时回退到默认值，不会抛错） */
export function loadConfig(): AppConfig {
  const path = getConfigPath()
  try {
    if (!existsSync(path)) return fallbackConfig()
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    return normalize(stripMeta(raw) as Partial<AppConfig>)
  } catch (err) {
    console.error('[config] 读取配置失败，使用默认配置：', err)
    return fallbackConfig()
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
