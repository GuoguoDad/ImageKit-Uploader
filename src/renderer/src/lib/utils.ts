/** 拼接 className，过滤掉假值 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** 人类可读的文件体积 */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`
}

/** 相对时间：刚刚 / 3 分钟前 / 2 天前 */
export function formatRelativeTime(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const diff = Date.now() - time
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

/** 去掉扩展名的文件名 */
export function stripExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(0, index) : name
}

/** 复制文本到剪贴板，兼容 file:// 场景 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 降到 execCommand 兜底 */
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

/** 用 URL Endpoint 和 filePath 拼出可直接访问的 CDN 链接 */
export function joinCdnUrl(urlEndpoint: string, filePath: string, fallback?: string): string {
  const base = (urlEndpoint ?? '').trim().replace(/\/+$/, '')
  if (!base || !filePath) return fallback ?? ''
  return `${base}${filePath.startsWith('/') ? filePath : `/${filePath}`}`
}

/** 缩短过长的字符串用于展示 */
export function truncateMiddle(value: string, max = 44): string {
  if (value.length <= max) return value
  const half = Math.floor((max - 1) / 2)
  return `${value.slice(0, half)}…${value.slice(-half)}`
}

/** 生成简单的唯一 id */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface Crumb {
  name: string
  path: string
}

/** 把绝对路径拆成可点击的面包屑（兼容 Windows 反斜杠与盘符） */
export function pathBreadcrumbs(fullPath: string): Crumb[] {
  if (!fullPath) return []
  const normalized = fullPath.replace(/\\/g, '/')
  const isWindows = /^[a-zA-Z]:/.test(normalized)
  const parts = normalized.split('/').filter(Boolean)

  const crumbs: Crumb[] = []
  if (!isWindows) crumbs.push({ name: '/', path: '/' })

  let acc = ''
  parts.forEach((part, index) => {
    if (isWindows && index === 0) {
      acc = `${part}/`
      crumbs.push({ name: `${part.toUpperCase()}\\`, path: acc })
      return
    }
    acc = acc.endsWith('/') ? `${acc}${part}` : acc ? `${acc}/${part}` : `/${part}`
    crumbs.push({ name: part, path: acc })
  })

  return crumbs
}

/** 面包屑过长时折叠中间部分，返回的结果里 '…' 表示省略 */
export function collapseCrumbs(items: Crumb[], max = 5): Array<Crumb | 'ellipsis'> {
  if (items.length <= max) return items
  const head = Math.ceil((max - 1) / 2)
  const tail = max - 1 - head
  return [...items.slice(0, head), 'ellipsis', ...items.slice(items.length - tail)]
}

/** 取文件扩展名（小写，不含点） */
export function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index + 1).toLowerCase() : ''
}

/* ----------------------- ImageKit 云端路径 ----------------------- */

/** 规范云端路径：始终以 / 开头、折叠重复斜杠、去掉尾斜杠 */
export function normalizeRemotePath(input: string): string {
  const raw = String(input ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
  if (!raw || raw === '/') return '/'
  const withLead = raw.startsWith('/') ? raw : `/${raw}`
  return withLead.replace(/\/+$/, '') || '/'
}

/** 云端路径的父目录，根目录返回 null */
export function remoteParentPath(path: string): string | null {
  const parts = String(path ?? '')
    .split('/')
    .filter(Boolean)
  if (parts.length === 0) return null
  return parts.length === 1 ? '/' : `/${parts.slice(0, -1).join('/')}`
}

/** 云端路径转面包屑，根目录显示为「根目录」 */
export function remoteBreadcrumbs(path: string): Crumb[] {
  const crumbs: Crumb[] = [{ name: '根目录', path: '/' }]
  let acc = ''
  for (const part of String(path ?? '')
    .split('/')
    .filter(Boolean)) {
    acc += `/${part}`
    crumbs.push({ name: part, path: acc })
  }
  return crumbs
}
