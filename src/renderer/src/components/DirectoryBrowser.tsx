import { useMemo } from 'react'
import { useT } from '../lib/i18n'
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
  const t = useT()
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
          <p>{t('local.noFolder')}</p>
          <span>{t('local.noFolderHint')}</span>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            disabled={loading}
            onClick={() => void browser.pick()}
          >
            <IconFolderOpen size={15} />
            {loading ? t('common.loading') : t('local.pickFolder')}
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
          {t('local.pickFolder')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={loading || !listing.parent}
          title={listing.parent ? t('common.back', { path: listing.parent }) : t('common.alreadyRoot')}
          onClick={() => void browser.goParent()}
        >
          <IconArrowUp size={14} />
          {t('common.up')}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          disabled={loading}
          title={t('common.refresh')}
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
          <span>{t('local.showHidden')}</span>
        </label>
      </div>

      {/* 面包屑 */}
      <nav className="crumb" aria-label={listing.path}>
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
          {t('local.truncated', { shown: listing.entries.length, total: listing.total })}
        </p>
      )}

      {/* 列表 */}
      <div className="browser__list">
        {loading && <div className="browser__loading">{t('common.loading')}</div>}

        {!loading && dirs.length === 0 && files.length === 0 && (
          <div className="browser__empty-hint">{t('local.emptyDir')}</div>
        )}

        {dirs.length > 0 && (
          <>
            <div className="browser__group">
              {t('local.groupDirs')}
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
                  <span className="entry__badge" title={t('local.symlink')}>
                    <IconLink size={11} />
                  </span>
                )}
                <span className="entry__meta">{t('common.enter')}</span>
                <IconChevronRight size={14} />
              </button>
            ))}
          </>
        )}

        {files.length > 0 && (
          <>
            <div className="browser__group">
              {t('local.groupFiles')}
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
        <label className="checkbox" title={t('local.includeSubTitle')}>
          <input
            type="checkbox"
            checked={recursive}
            onChange={(e) => browser.setRecursive(e.target.checked)}
          />
          <span>{t('local.includeSub')}</span>
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={files.length === 0}
          onClick={() =>
            allSelected ? browser.clearSelection() : browser.selectAll(allFilePaths)
          }
        >
          {allSelected ? t('local.deselectAll') : t('local.selectAll', { n: files.length })}
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={browser.clearSelection}
          >
            {t('local.clearSelection')}
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
          {recursive ? t('local.addRecursive') : t('local.addCurrent')}
        </button>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={selectedCount === 0}
          onClick={() => onAdd(Array.from(selected))}
        >
          <IconUpload size={14} />
          {t('local.addSelected')}
          {selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
      </div>
    </div>
  )
}
