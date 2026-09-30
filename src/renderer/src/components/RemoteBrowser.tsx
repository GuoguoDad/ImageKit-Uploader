import { useMemo, useState } from 'react'
import type { RemoteFile, RemoteFolder } from '@shared/types'
import type { RemoteBrowser as RemoteBrowserState } from '../hooks/useRemoteBrowser'
import { useI18n } from '../lib/i18n'
import {
  cn,
  collapseCrumbs,
  formatBytes,
  formatRelativeTime,
  normalizeRemotePath,
  remoteBreadcrumbs
} from '../lib/utils'
import {
  IconArrowUp,
  IconCheck,
  IconChevronRight,
  IconCloud,
  IconCopy,
  IconExternal,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconHome,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTarget
} from './Icons'

/** 云端路径面包屑，本地目录与云端目录两处共用 */
export function RemoteBreadcrumbs({
  path,
  onOpen
}: {
  path: string
  onOpen: (path: string) => void
}) {
  const { t } = useI18n()
  const crumbs = useMemo(
    () => collapseCrumbs(remoteBreadcrumbs(path, t('common.root')), 5),
    [path, t]
  )

  return (
    <nav className="crumb" aria-label={path}>
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1
        return crumb === 'ellipsis' ? (
          <span key={`gap-${index}`} className="crumb__gap">
            …
          </span>
        ) : (
          <span key={crumb.path} className="crumb__item">
            <button
              type="button"
              className={cn('crumb__link', isCurrent && 'crumb__link--current')}
              title={crumb.path}
              onClick={() => {
                if (!isCurrent) onOpen(crumb.path)
              }}
            >
              {crumb.name}
            </button>
            {!isCurrent && <span className="crumb__sep">/</span>}
          </span>
        )
      })}
    </nav>
  )
}

/** 文件缩略图：加载失败时降级成文件图标 */
function FileThumb({ file }: { file: RemoteFile }) {
  const [failed, setFailed] = useState(false)
  const showImage = file.fileType === 'image' && Boolean(file.thumbnail) && !failed

  return (
    <span className="r-entry__thumb">
      {showImage ? (
        <img src={file.thumbnail} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="r-entry__thumb-icon">
          <IconFile size={15} />
        </span>
      )}
    </span>
  )
}

/**
 * 目录行：单击即把该目录设为上传目标，双击或点右侧 → 进入该目录。
 * 沿用文件管理器的习惯——单击是「选中」，双击是「打开」。
 */
function FolderRow({
  folder,
  isTarget,
  onSelect,
  onEnter
}: {
  folder: RemoteFolder
  isTarget: boolean
  onSelect: () => void
  onEnter: () => void
}) {
  const { t } = useI18n()

  return (
    <div className={cn('entry', 'entry--dir', 'r-entry', isTarget && 'r-entry--target')}>
      <button
        type="button"
        className="r-entry__main"
        title={t('remote.rowTitle', { path: folder.path })}
        onClick={onSelect}
        onDoubleClick={onEnter}
      >
        <span className="entry__icon entry__icon--dir">
          <IconFolder size={16} />
        </span>
        <span className="entry__name">{folder.name}</span>
      </button>

      {folder.pending && (
        <span className="entry__badge" title={t('remote.indexBadge')}>
          {t('common.syncing')}
        </span>
      )}

      {isTarget && (
        <span className="r-tag r-tag--target" title={t('remote.isTargetTitle')}>
          <IconCheck size={11} />
          {t('remote.isTarget')}
        </span>
      )}

      <button
        type="button"
        className="icon-btn icon-btn--sm"
        title={t('remote.rowOpenTitle', { path: folder.path })}
        onClick={onEnter}
      >
        <IconChevronRight size={14} />
      </button>
    </div>
  )
}

interface RemoteBrowserProps {
  browser: RemoteBrowserState
  /** 是否已配置 ImageKit 凭证 */
  configured: boolean
  /** 当前上传目标目录 */
  targetFolder: string
  onSelectTarget: (path: string) => void
  onCopy: (text: string, label: string) => void
  onOpenUrl: (url: string) => void
  onOpenSettings: () => void
}

/** ImageKit 云端目录浏览：列出子目录与已上传文件 */
export function RemoteBrowser({
  browser,
  configured,
  targetFolder,
  onSelectTarget,
  onCopy,
  onOpenUrl,
  onOpenSettings
}: RemoteBrowserProps) {
  const { t, locale } = useI18n()
  const { listing, folders, loading, loadingMore, error } = browser
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const files = listing?.files ?? []
  const pendingCount = folders.filter((f) => f.pending).length
  const totalSize = files.reduce((sum, file) => sum + (file.size ?? 0), 0)
  // 上传目标比较统一走规范化路径，避免 "/a/" 与 "/a" 被当成两个目录
  const target = normalizeRemotePath(targetFolder)
  const rootIsTarget = target === '/'
  /** 当前正在浏览的目录是否就是上传目标 */
  const viewingIsTarget = normalizeRemotePath(listing?.path ?? '') === target

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const made = await browser.createFolder(name)
      if (made) {
        setNewName('')
        setNewOpen(false)
      }
    } finally {
      setCreating(false)
    }
  }

  /* ---------------- 未配置凭证 ---------------- */
  if (!configured) {
    return (
      <div className="browser browser--empty">
        <div className="empty">
          <IconCloud size={30} />
          <p>{t('remote.needConfig')}</p>
          <span>{t('remote.needConfigHint')}</span>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={onOpenSettings}
          >
            <IconSettings size={15} />
            {t('common.configure')}
          </button>
        </div>
      </div>
    )
  }

  /* ---------------- 还没打开任何目录 ---------------- */
  if (!listing && !loading) {
    return (
      <div className="browser browser--empty">
        <div className="empty">
          <IconCloud size={30} />
          <p>{error ? t('remote.loadFailed') : t('remote.notOpened')}</p>
          <span>{error ?? t('remote.introHint')}</span>
          {error && <span className="empty__error">{error}</span>}
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={() => void browser.open('/')}
          >
            <IconFolderOpen size={15} />
            {t('remote.openRoot')}
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
          className="btn btn--ghost btn--sm"
          disabled={loading || !listing?.parent}
          title={
            listing?.parent
              ? t('common.back', { path: listing.parent })
              : t('common.alreadyRoot')
          }
          onClick={() => void browser.goParent()}
        >
          <IconArrowUp size={14} />
          {t('common.up')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={loading || listing?.path === '/'}
          onClick={() => void browser.goRoot()}
        >
          <IconHome size={14} />
          {t('common.root')}
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
        <button
          type="button"
          className={cn('btn', 'btn--sm', newOpen && 'btn--primary')}
          disabled={loading || !listing}
          onClick={() => setNewOpen((v) => !v)}
        >
          <IconPlus size={14} />
          {t('common.newFolder')}
        </button>

        <div className="browser__spacer" />

        <span className="r-target" title={t('remote.targetTitle', { path: targetFolder })}>
          <IconTarget size={12} />
          {targetFolder || '/'}
        </span>
      </div>

      {listing && <RemoteBreadcrumbs path={listing.path} onOpen={(p) => void browser.open(p)} />}

      {newOpen && (
        <div className="r-new">
          <IconPlus size={14} />
          <input
            className="input"
            value={newName}
            autoFocus
            spellCheck={false}
            placeholder={t('common.newFolderPlaceholder')}
            disabled={creating}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
              if (e.key === 'Escape') {
                setNewOpen(false)
                setNewName('')
              }
            }}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            {creating ? t('common.creating') : t('common.create')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={creating}
            onClick={() => {
              setNewOpen(false)
              setNewName('')
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {pendingCount > 0 && (
        <p className="browser__warn">{t('remote.pending', { n: pendingCount })}</p>
      )}

      {error && <p className="browser__warn">{error}</p>}

      {/* 列表 */}
      <div className="browser__list">
        {loading && <div className="browser__loading">{t('common.loading')}</div>}

        {!loading && folders.length === 0 && files.length === 0 && (
          <div className="browser__empty-hint">
            {t('remote.emptyDirHint')}
            <code>{listing?.path}</code>
          </div>
        )}

        {!loading && folders.length > 0 && (
          <>
            <div className="browser__group">
              {t('remote.groupFolders')}
              <b>{folders.length}</b>
              <span className="browser__group-note">{t('remote.groupNote')}</span>
            </div>
            {folders.map((folder) => (
              <FolderRow
                key={folder.path}
                folder={folder}
                isTarget={normalizeRemotePath(folder.path) === target}
                onSelect={() => onSelectTarget(folder.path)}
                onEnter={() => void browser.open(folder.path)}
              />
            ))}
          </>
        )}

        {!loading && files.length > 0 && (
          <>
            <div className="browser__group">
              {t('remote.groupFiles')}
              <b>{files.length}</b>
              {totalSize > 0 && (
                <span className="browser__group-note">
                  {t('remote.totalSize', { size: formatBytes(totalSize) })}
                </span>
              )}
            </div>
            {files.map((file) => {
              const link = file.cdnUrl || file.url
              return (
                <div key={file.fileId} className="entry r-entry">
                  <FileThumb file={file} />

                  <button
                    type="button"
                    className="r-entry__main"
                    title={file.filePath}
                    onClick={() => onOpenUrl(link)}
                  >
                    <span className="entry__name">{file.name}</span>
                  </button>

                  {file.isPrivateFile && (
                    <span className="entry__badge" title={t('remote.privateBadge')}>
                      {t('common.private')}
                    </span>
                  )}

                  <span className="entry__meta">
                    {file.width && file.height ? `${file.width}×${file.height}` : ''}
                  </span>
                  <span className="entry__meta">{formatBytes(file.size)}</span>
                  <span className="entry__meta">
                    {file.createdAt ? formatRelativeTime(file.createdAt, t, locale) : ''}
                  </span>

                  <span className="r-entry__actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title={t('common.copyLink')}
                      onClick={() => onCopy(link, file.name)}
                    >
                      <IconCopy size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title={t('common.copyMarkdown')}
                      onClick={() => onCopy(`![${file.name}](${link})`, file.name)}
                    >
                      <b className="r-entry__md">MD</b>
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title={t('common.openInBrowser')}
                      onClick={() => onOpenUrl(link)}
                    >
                      <IconExternal size={14} />
                    </button>
                  </span>
                </div>
              )
            })}

            {listing?.hasMoreFiles && (
              <div className="r-more">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={loadingMore}
                  onClick={() => void browser.loadMore()}
                >
                  {loadingMore ? t('common.loadingMore') : t('remote.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部操作：当前所在目录一键设为上传目标 */}
      <div className="browser__actions">
        <span className="browser__actions-hint">{t('remote.targetValue', { path: target })}</span>

        <div className="browser__spacer" />

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!listing || rootIsTarget}
          onClick={() => onSelectTarget('/')}
        >
          {t('remote.uploadToRoot')}
        </button>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!listing || viewingIsTarget}
          onClick={() => listing && onSelectTarget(listing.path)}
        >
          <IconTarget size={14} />
          {viewingIsTarget
            ? t('remote.alreadyTarget')
            : t('remote.uploadHere', { path: listing?.path ?? '/' })}
        </button>
      </div>
    </div>
  )
}
