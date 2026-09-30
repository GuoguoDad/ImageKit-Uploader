import { useCallback, useState } from 'react'
import type { DirListing } from '@shared/types'
import type { Toast } from './useToasts'

export interface DirectoryBrowser {
  listing: DirListing | null
  loading: boolean
  showHidden: boolean
  selected: Set<string>
  recursive: boolean
  setShowHidden: (value: boolean) => void
  setRecursive: (value: boolean) => void
  /** 打开指定目录并刷新列表 */
  open: (dirPath: string) => Promise<void>
  /** 弹出系统目录选择器，返回选中的路径（取消返回 null） */
  pick: () => Promise<string | null>
  refresh: () => Promise<void>
  goParent: () => Promise<void>
  toggleSelect: (path: string) => void
  selectAll: (paths: string[]) => void
  clearSelection: () => void
}

/** 目录浏览的状态与操作，独立成一个 hook 避免 App 过于臃肿 */
export function useDirectoryBrowser(
  push: (kind: Toast['kind'], message: string) => void
): DirectoryBrowser {
  const [listing, setListing] = useState<DirListing | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recursive, setRecursive] = useState(false)

  const open = useCallback(
    async (dirPath: string) => {
      if (!dirPath) return
      setLoading(true)
      try {
        const res = await window.api.fs.listDir(dirPath)
        if (!res.ok) {
          push('error', res.error)
          return
        }
        setListing(res.data)
        setSelected(new Set())
      } catch (err) {
        push('error', err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [push]
  )

  const pick = useCallback(async (): Promise<string | null> => {
    setLoading(true)
    try {
      const res = await window.api.fs.pickDirectory()
      if (!res.ok) {
        push('error', res.error)
        return null
      }
      if (!res.data) return null
      await open(res.data)
      return res.data
    } finally {
      setLoading(false)
    }
  }, [open, push])

  const refresh = useCallback(async () => {
    const current = listing?.path
    if (current) await open(current)
  }, [listing, open])

  const goParent = useCallback(async () => {
    const parent = listing?.parent
    if (parent) await open(parent)
  }, [listing, open])

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const selectAll = useCallback((paths: string[]) => {
    setSelected(new Set(paths))
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
  }, [])

  return {
    listing,
    loading,
    showHidden,
    selected,
    recursive,
    setShowHidden,
    setRecursive,
    open,
    pick,
    refresh,
    goParent,
    toggleSelect,
    selectAll,
    clearSelection
  }
}
