import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TranslateFn } from '@shared/i18n'
import type { RemoteFolder, RemoteListing } from '@shared/types'
import { useI18n } from '../lib/i18n'
import { remoteParentPath } from '../lib/utils'
import type { Toast } from './useToasts'

/** 每次拉取的文件条数 */
const PAGE_SIZE = 100

/**
 * ImageKit 的目录是虚拟的，新建目录后列表接口有 2~4 秒索引延迟，
 * 因此创建成功后按这几个时间点做静默重试刷新。
 */
const INDEX_REFRESH_DELAYS = [1500, 4000, 8000]

export interface RemoteBrowser {
  listing: RemoteListing | null
  /** 展示用目录列表：把本地刚创建、服务端还没索引的目录合并进来 */
  folders: RemoteFolder[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  open: (path: string) => Promise<void>
  refresh: (options?: { silent?: boolean }) => Promise<void>
  goParent: () => Promise<void>
  goRoot: () => Promise<void>
  loadMore: () => Promise<void>
  /** 在当前云端目录下新建子目录，返回新目录路径 */
  createFolder: (name: string) => Promise<string | null>
}

/** 云端目录浏览的状态与操作。foldersOnly 用于「选择上传目录」的轻量场景 */
export function useRemoteBrowser(
  push: (kind: Toast['kind'], message: string) => void,
  options: { foldersOnly?: boolean; t?: TranslateFn; locale?: string } = {}
): RemoteBrowser {
  const foldersOnly = options.foldersOnly ?? false
  // App 在 I18nProvider 之外调用本 hook，因此允许显式传入；否则走上下文
  const ctx = useI18n()
  const t = options.t ?? ctx.t
  const locale = options.locale ?? ctx.locale

  const [listing, setListing] = useState<RemoteListing | null>(null)
  const [pendingFolders, setPendingFolders] = useState<RemoteFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** 当前目录，供异步回调读取最新值 */
  const pathRef = useRef('')
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const apply = useCallback((next: RemoteListing) => {
    pathRef.current = next.path
    setListing(next)
    setError(null)
    // 服务端已经索引到的目录，去掉本地「同步中」标记
    const visible = new Set(next.folders.map((f) => f.path))
    setPendingFolders((prev) => (prev.length === 0 ? prev : prev.filter((p) => !visible.has(p.path))))
  }, [])

  const fetchPath = useCallback(
    async (path: string): Promise<void> => {
      const res = await window.api.ik.listRemote({
        path,
        options: foldersOnly ? { foldersOnly: true } : { fileLimit: PAGE_SIZE, fileSkip: 0 }
      })
      if (!res.ok) throw new Error(res.error)
      apply(res.data)
    },
    [apply, foldersOnly]
  )

  const open = useCallback(
    async (path: string) => {
      setLoading(true)
      try {
        await fetchPath(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [fetchPath]
  )

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const current = pathRef.current
      if (!current) return
      if (opts?.silent) {
        // 静默刷新失败不打扰用户，反正列表里已有内容
        try {
          await fetchPath(current)
        } catch {
          /* 忽略 */
        }
        return
      }
      await open(current)
    },
    [fetchPath, open]
  )

  const goParent = useCallback(async () => {
    const parent = pathRef.current ? remoteParentPath(pathRef.current) : null
    if (parent) await open(parent)
  }, [open])

  const goRoot = useCallback(async () => {
    await open('/')
  }, [open])

  const loadMore = useCallback(async () => {
    const current = listing
    if (!current || foldersOnly || loadingMore || !current.hasMoreFiles) return

    setLoadingMore(true)
    try {
      const res = await window.api.ik.listRemote({
        path: current.path,
        options: { fileLimit: current.fileLimit, fileSkip: current.files.length }
      })
      if (!res.ok) {
        push('error', res.error)
        return
      }
      const page = res.data
      setListing((prev) =>
        prev && prev.path === page.path
          ? { ...page, files: [...prev.files, ...page.files], fileSkip: prev.fileSkip }
          : prev
      )
    } finally {
      setLoadingMore(false)
    }
  }, [foldersOnly, listing, loadingMore, push])

  const createFolder = useCallback(
    async (name: string): Promise<string | null> => {
      const current = pathRef.current
      if (!current) return null

      const res = await window.api.ik.createRemoteFolder({ parentPath: current, name })
      if (!res.ok) {
        push('error', res.error)
        return null
      }

      // 先本地乐观插入，避免用户以为没建成
      setPendingFolders((prev) => [...prev.filter((p) => p.path !== res.data.path), res.data])
      push('success', t('toast.folderCreated', { path: res.data.path }))

      clearTimers()
      for (const delay of INDEX_REFRESH_DELAYS) {
        timers.current.push(window.setTimeout(() => void refresh({ silent: true }), delay))
      }

      return res.data.path
    },
    [clearTimers, push, refresh, t]
  )

  /** 合并「本地刚创建」的目录 */
  const folders = useMemo(() => {
    const base = listing?.folders ?? []
    if (pendingFolders.length === 0) return base

    const current = listing?.path ?? '/'
    const known = new Set(base.map((f) => f.path))
    const extra = pendingFolders.filter(
      (item) => remoteParentPath(item.path) === current && !known.has(item.path)
    )
    if (extra.length === 0) return base

    return [...extra, ...base].sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [listing, pendingFolders, locale])

  return {
    listing,
    folders,
    loading,
    loadingMore,
    error,
    open,
    refresh,
    goParent,
    goRoot,
    loadMore,
    createFolder
  }
}
