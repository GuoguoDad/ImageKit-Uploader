import { readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import type { DirEntry, DirListing, PathClassification } from '@shared/types'
import { mimeFor } from './mime'

/** 单次列目录最多返回的条目数，避免超大目录卡住渲染 */
const MAX_ENTRIES = 3000
/** 递归收集文件时的上限 */
const MAX_COLLECT = 2000
/** stat 的并发度，避免一次打开上千个文件句柄 */
const STAT_CONCURRENCY = 32
/** 递归时跳过的目录名 */
const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.DS_Store'])

/** 并发受限的 map：保持结果顺序，避免一次性打爆文件句柄 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const result = new Array<R>(items.length)
  let cursor = 0
  const size = Math.max(1, Math.min(limit, items.length))
  const workers = Array.from({ length: size }, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      result[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return result
}

function isHiddenName(name: string): boolean {
  return name.startsWith('.')
}

function assertAbsolute(dirPath: string): void {
  if (!dirPath || !isAbsolute(dirPath)) throw new Error('只能浏览绝对路径')
}

/** 把系统级的 fs 错误翻译成用户看得懂的中文提示 */
function friendlyFsError(err: unknown, target: string): Error {
  const code = (err as NodeJS.ErrnoException)?.code
  switch (code) {
    case 'ENOENT':
      return new Error(`路径不存在：${target}`)
    case 'EACCES':
    case 'EPERM':
      return new Error(`没有权限访问：${target}`)
    case 'ENOTDIR':
      return new Error('该路径不是目录')
    case 'ELOOP':
      return new Error('软链接循环，无法读取该目录')
    default:
      return err instanceof Error ? err : new Error(String(err))
  }
}

/** 列出目录内容：目录排在前面，其余按名称自然序 */
export async function listDirectory(dirPath: string): Promise<DirListing> {
  assertAbsolute(dirPath)

  const info = await stat(dirPath).catch((err: unknown) => {
    throw friendlyFsError(err, dirPath)
  })
  if (!info.isDirectory()) throw new Error('该路径不是目录')

  const dirents = await readdir(dirPath, { withFileTypes: true }).catch((err: unknown) => {
    throw friendlyFsError(err, dirPath)
  })
  const total = dirents.length
  const picked = dirents.slice(0, MAX_ENTRIES)

  const entries = await mapLimit(picked, STAT_CONCURRENCY, async (dirent): Promise<DirEntry | null> => {
    const full = join(dirPath, dirent.name)
    try {
      const entryInfo = await stat(full)
      const isDirectory = entryInfo.isDirectory()
      const ext = isDirectory ? '' : extname(dirent.name).toLowerCase()
      return {
        name: dirent.name,
        path: full,
        isDirectory,
        isSymbolicLink: dirent.isSymbolicLink(),
        size: isDirectory ? 0 : entryInfo.size,
        type: isDirectory ? 'inode/directory' : mimeFor(ext),
        mtime: entryInfo.mtimeMs,
        hidden: isHiddenName(dirent.name)
      }
    } catch {
      // 断链的软链接 / 无权限访问，直接跳过
      return null
    }
  })

  const list = entries.filter((e): e is DirEntry => e !== null)
  list.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' })
  })

  const parent = dirname(dirPath)

  return {
    path: dirPath,
    name: basename(dirPath) || dirPath,
    parent: parent === dirPath ? null : parent,
    entries: list,
    truncated: total > MAX_ENTRIES,
    total
  }
}

/** 收集目录下的文件路径（可选递归），隐藏文件与常见依赖目录会被跳过 */
export async function collectFiles(
  dirPath: string,
  recursive: boolean,
  limit = MAX_COLLECT
): Promise<string[]> {
  assertAbsolute(dirPath)

  const info = await stat(dirPath).catch((err: unknown) => {
    throw friendlyFsError(err, dirPath)
  })
  if (!info.isDirectory()) throw new Error('该路径不是目录')

  const found: string[] = []
  const pending: string[] = [dirPath]

  while (pending.length > 0 && found.length < limit) {
    const current = pending.shift()
    if (!current) break

    let dirents
    try {
      dirents = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const dirent of dirents) {
      if (found.length >= limit) break
      const full = join(current, dirent.name)

      let isDirectory = dirent.isDirectory()
      let isFile = dirent.isFile()

      // 软链接只认「指向普通文件」的情况；指向目录的一律不递归进去，
      // 既能避免软链循环，也避免顺着链接跑到用户选的目录之外
      if (!isDirectory && !isFile && dirent.isSymbolicLink()) {
        try {
          const linked = await stat(full)
          isFile = linked.isFile()
        } catch {
          continue
        }
      }

      if (isDirectory) {
        if (!recursive) continue
        if (isHiddenName(dirent.name) || SKIP_DIRS.has(dirent.name)) continue
        pending.push(full)
      } else if (isFile) {
        if (isHiddenName(dirent.name)) continue
        found.push(full)
      }
    }
  }

  return found
}

/** 把一批路径分成「普通文件」和「目录」两类 */
export async function classifyPaths(paths: string[]): Promise<PathClassification> {
  const results = await mapLimit(paths, 16, async (p) => {
    try {
      const info = await stat(p)
      if (info.isDirectory()) return { kind: 'dir' as const, path: p }
      if (info.isFile()) return { kind: 'file' as const, path: p }
      return { kind: 'other' as const, path: p }
    } catch {
      return { kind: 'other' as const, path: p }
    }
  })

  return {
    files: results.filter((r) => r.kind === 'file').map((r) => r.path),
    dirs: results.filter((r) => r.kind === 'dir').map((r) => r.path)
  }
}
