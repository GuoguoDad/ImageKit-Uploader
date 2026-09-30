import { useMemo, useState } from 'react'
import type { RemoteFile, RemoteFolder } from '@shared/types'
import type { RemoteBrowser as RemoteBrowserState } from '../hooks/useRemoteBrowser'
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
  const crumbs = useMemo(() => collapseCrumbs(remoteBreadcrumbs(path), 5), [path])

  return (
    <nav className="crumb" aria-label="云端路径">
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
  return (
    <div className={cn('entry', 'entry--dir', 'r-entry', isTarget && 'r-entry--target')}>
      <button
        type="button"
        className="r-entry__main"
        title={`单击：把 ${folder.path} 设为上传目录 · 双击：进入该目录`}
        onClick={onSelect}
        onDoubleClick={onEnter}
      >
        <span className="entry__icon entry__icon--dir">
          <IconFolder size={16} />
        </span>
        <span className="entry__name">{folder.name}</span>
      </button>

      {folder.pending && (
        <span className="entry__badge" title="ImageKit 目录索引有延迟，稍后会自动同步">
          同步中
        </span>
      )}

      {isTarget && (
        <span className="r-tag r-tag--target" title="当前上传目标目录">
          <IconCheck size={11} />
          上传目标
        </span>
      )}

      <button
        type="button"
        className="icon-btn icon-btn--sm"
        title={`进入 ${folder.path}`}
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
          <p>需要先配置 ImageKit 凭证</p>
          <span>填写 Public Key 与 Private Key 后，才能读取云端目录与文件</span>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={onOpenSettings}
          >
            <IconSettings size={15} />
            去配置
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
          <p>{error ? '读取云端目录失败' : '还没有打开云端目录'}</p>
          <span>{error ?? '读取 ImageKit 上已有的目录和文件，并选择上传到哪个目录'}</span>
          {error && <span className="empty__error">{error}</span>}
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={() => void browser.open('/')}
          >
            <IconFolderOpen size={15} />
            打开根目录
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
          title={listing?.parent ? `返回 ${listing.parent}` : '已经是根目录'}
          onClick={() => void browser.goParent()}
        >
          <IconArrowUp size={14} />
          上级
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={loading || listing?.path === '/'}
          onClick={() => void browser.goRoot()}
        >
          <IconHome size={14} />
          根目录
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
        <button
          type="button"
          className={cn('btn', 'btn--sm', newOpen && 'btn--primary')}
          disabled={loading || !listing}
          onClick={() => setNewOpen((v) => !v)}
        >
          <IconPlus size={14} />
          新建目录
        </button>

        <div className="browser__spacer" />

        <span className="r-target" title={`上传目标目录：${targetFolder}`}>
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
            placeholder="新目录名，例如 banner"
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
            {creating ? '创建中…' : '在当前位置创建'}
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
            取消
          </button>
        </div>
      )}

      {pendingCount > 0 && (
        <p className="browser__warn">
          有 {pendingCount} 个目录正在等待 ImageKit 建立索引（通常几秒），已自动重试刷新。
        </p>
      )}

      {error && <p className="browser__warn">{error}</p>}

      {/* 列表 */}
      <div className="browser__list">
        {loading && <div className="browser__loading">读取中…</div>}

        {!loading && folders.length === 0 && files.length === 0 && (
          <div className="browser__empty-hint">
            这个云端目录是空的。可以直接把文件上传到 <code>{listing?.path}</code>
          </div>
        )}

        {!loading && folders.length > 0 && (
          <>
            <div className="browser__group">
              子目录
              <b>{folders.length}</b>
              <span className="browser__group-note">单击选中为上传目录 · 双击进入</span>
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
              已上传文件
              <b>{files.length}</b>
              {totalSize > 0 && <span className="browser__group-note">共 {formatBytes(totalSize)}</span>}
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
                    <span className="entry__badge" title="私有文件，访问需要签名">
                      私有
                    </span>
                  )}

                  <span className="entry__meta">
                    {file.width && file.height ? `${file.width}×${file.height}` : ''}
                  </span>
                  <span className="entry__meta">{formatBytes(file.size)}</span>
                  <span className="entry__meta">
                    {file.createdAt ? formatRelativeTime(file.createdAt) : ''}
                  </span>

                  <span className="r-entry__actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title="复制链接"
                      onClick={() => onCopy(link, file.name)}
                    >
                      <IconCopy size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title="复制 Markdown"
                      onClick={() => onCopy(`![${file.name}](${link})`, file.name)}
                    >
                      <b className="r-entry__md">MD</b>
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title="在浏览器打开"
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
                  {loadingMore ? '加载中…' : '加载更多文件'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部操作：当前所在目录一键设为上传目标 */}
      <div className="browser__actions">
        <span className="browser__actions-hint">
          上传目标：<code>{target}</code>
        </span>

        <div className="browser__spacer" />

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!listing || rootIsTarget}
          onClick={() => onSelectTarget('/')}
        >
          上传到根目录
        </button>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!listing || viewingIsTarget}
          onClick={() => listing && onSelectTarget(listing.path)}
        >
          <IconTarget size={14} />
          {viewingIsTarget ? '当前就是上传目录' : `上传到 ${listing?.path}`}
        </button>
      </div>
    </div>
  )
}
