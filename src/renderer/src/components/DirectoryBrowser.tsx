import { useMemo } from 'react'
import { cn, collapseCrumbs, formatBytes, pathBreadcrumbs } from '../lib/utils'
import type { DirectoryBrowser as BrowserState } from '../hooks/useDirectoryBrowser'
import {
  IconArrowUp,
  IconChevronRight,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconImage,
  IconLink,
  IconRefresh,
  IconUpload
} from './Icons'

interface DirectoryBrowserProps {
  browser: BrowserState
  onAdd: (paths: string[]) => void
}

const IMAGE_EXT = new Set([
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
])

function fileIcon(name: string) {
  const index = name.lastIndexOf('.')
  const ext = index > 0 ? name.slice(index + 1).toLowerCase() : ''
  return IMAGE_EXT.has(ext) ? <IconImage size={16} /> : <IconFile size={16} />
}

export function DirectoryBrowser({ browser, onAdd }: DirectoryBrowserProps) {
  const { listing, loading, showHidden, selected, recursive } = browser

  const { dirs, files } = useMemo(() => {
    const entries = listing?.entries ?? []
    const visible = showHidden ? entries : entries.filter((e) => !e.hidden)
    return {
      dirs: visible.filter((e) => e.isDirectory),
      files: visible.filter((e) => !e.isDirectory)
    }
  }, [listing, showHidden])

  const crumbs = useMemo(
    () => collapseCrumbs(pathBreadcrumbs(listing?.path ?? ''), 5),
    [listing?.path]
  )

  const allFilePaths = files.map((f) => f.path)
  const selectedCount = selected.size
  const allSelected = allFilePaths.length > 0 && allFilePaths.every((p) => selected.has(p))

  /* ---------------- 未选择目录 ---------------- */
  if (!listing) {
    return (
      <div className="browser browser--empty">
        <div className="empty">
          <IconFolderOpen size={30} />
          <p>还没有选择目录</p>
          <span>选一个本地目录，就能列出里面的子目录和文件</span>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            disabled={loading}
            onClick={() => void browser.pick()}
          >
            <IconFolderOpen size={15} />
            {loading ? '读取中…' : '选择目录'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="browser">
      {/* 工具栏 */}
      <div className="browser__toolbar">
        <button
          type="button"
          className="btn btn--sm"
          disabled={loading}
          onClick={() => void browser.pick()}
        >
          <IconFolderOpen size={14} />
          选择目录
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={loading || !listing.parent}
          title={listing.parent ? `返回 ${listing.parent}` : '已经是根目录'}
          onClick={() => void browser.goParent()}
        >
          <IconArrowUp size={14} />
          上级
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          disabled={loading}
          title="刷新"
          onClick={() => void browser.refresh()}
        >
          <IconRefresh size={15} />
        </button>

        <div className="browser__spacer" />

        <label className="checkbox">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => browser.setShowHidden(e.target.checked)}
          />
          <span>显示隐藏文件</span>
        </label>
      </div>

      {/* 面包屑 */}
      <nav className="crumb" aria-label="路径">
        {crumbs.map((crumb, index) =>
          crumb === 'ellipsis' ? (
            <span key={`gap-${index}`} className="crumb__gap">
              …
            </span>
          ) : (
            <span key={crumb.path} className="crumb__item">
              <button
                type="button"
                className={cn('crumb__link', index === crumbs.length - 1 && 'crumb__link--current')}
                title={crumb.path}
                onClick={() => void browser.open(crumb.path)}
              >
                {crumb.name}
              </button>
              {index < crumbs.length - 1 && <span className="crumb__sep">/</span>}
            </span>
          )
        )}
      </nav>

      {listing.truncated && (
        <p className="browser__warn">
          目录条目过多，仅显示前 {listing.entries.length} 项（共 {listing.total} 项）
        </p>
      )}

      {/* 列表 */}
      <div className="browser__list">
        {loading && <div className="browser__loading">读取中…</div>}

        {!loading && dirs.length === 0 && files.length === 0 && (
          <div className="browser__empty-hint">这个目录是空的</div>
        )}

        {dirs.length > 0 && (
          <>
            <div className="browser__group">
              目录
              <b>{dirs.length}</b>
            </div>
            {dirs.map((entry) => (
              <button
                key={entry.path}
                type="button"
                className="entry entry--dir"
                title={entry.path}
                onClick={() => void browser.open(entry.path)}
              >
                <span className="entry__icon entry__icon--dir">
                  <IconFolder size={16} />
                </span>
                <span className="entry__name">{entry.name}</span>
                {entry.isSymbolicLink && (
                  <span className="entry__badge" title="软链接">
                    <IconLink size={11} />
                  </span>
                )}
                <span className="entry__meta">进入</span>
                <IconChevronRight size={14} />
              </button>
            ))}
          </>
        )}

        {files.length > 0 && (
          <>
            <div className="browser__group">
              文件
              <b>{files.length}</b>
            </div>
            {files.map((entry) => {
              const checked = selected.has(entry.path)
              return (
                <label
                  key={entry.path}
                  className={cn('entry entry--file', checked && 'entry--checked')}
                  title={entry.path}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => browser.toggleSelect(entry.path)}
                  />
                  <span className="entry__icon">{fileIcon(entry.name)}</span>
                  <span className="entry__name">{entry.name}</span>
                  <span className="entry__meta">{formatBytes(entry.size)}</span>
                </label>
              )
            })}
          </>
        )}
      </div>

      {/* 底部操作 */}
      <div className="browser__actions">
        <label className="checkbox" title="「添加当前目录文件」时是否一并包含子目录里的文件">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(e) => browser.setRecursive(e.target.checked)}
          />
          <span>包含子目录</span>
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={files.length === 0}
          onClick={() =>
            allSelected ? browser.clearSelection() : browser.selectAll(allFilePaths)
          }
        >
          {allSelected ? '取消全选' : `全选文件 (${files.length})`}
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={browser.clearSelection}
          >
            清空选择
          </button>
        )}

        <div className="browser__spacer" />

        <button
          type="button"
          className="btn btn--sm"
          disabled={loading}
          onClick={async () => {
            const res = await window.api.fs.collectFiles({
              dirPath: listing.path,
              recursive
            })
            if (!res.ok) return
            onAdd(res.data)
          }}
        >
          添加{recursive ? '（含子目录）' : '当前目录'}文件
        </button>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={selectedCount === 0}
          onClick={() => onAdd(Array.from(selected))}
        >
          <IconUpload size={14} />
          添加选中{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
      </div>
    </div>
  )
}
