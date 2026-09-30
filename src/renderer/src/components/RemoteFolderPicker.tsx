import { useEffect, useState } from 'react'
import type { RemoteFolder } from '@shared/types'
import { useRemoteBrowser } from '../hooks/useRemoteBrowser'
import type { Toast } from '../hooks/useToasts'
import { cn } from '../lib/utils'
import { RemoteBreadcrumbs } from './RemoteBrowser'
import {
  IconArrowUp,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconFolder,
  IconHome,
  IconPlus,
  IconRefresh,
  IconTarget
} from './Icons'

interface RemoteFolderPickerProps {
  open: boolean
  /** 当前上传目标目录 */
  value: string
  onClose: () => void
  onConfirm: (path: string) => void
  push: (kind: Toast['kind'], message: string) => void
}

/**
 * 云端目录选择器：只在 ImageKit 上浏览并选中一个目录，
 * 用于给「目录」输入框挑选上传目标。
 */
export function RemoteFolderPicker({
  open,
  value,
  onClose,
  onConfirm,
  push
}: RemoteFolderPickerProps) {
  const browser = useRemoteBrowser(push, { foldersOnly: true })
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // 每次打开都从根目录重新开始，避免看到过期数据
  useEffect(() => {
    if (!open) return
    setNewOpen(false)
    setNewName('')
    void browser.open('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const { listing, folders, loading, error } = browser
  const current = listing?.path ?? '/'

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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--picker"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__head">
          <div>
            <h2>选择上传目录</h2>
            <p>浏览 ImageKit 上已有的目录，选中后作为本次上传的目标目录</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="关闭">
            <IconClose size={17} />
          </button>
        </div>

        <div className="modal__body modal__body--flush">
          <div className="browser browser--in-modal">
            <div className="browser__toolbar">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={loading || !listing?.parent}
                onClick={() => void browser.goParent()}
              >
                <IconArrowUp size={14} />
                上级
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={loading || current === '/'}
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
            </div>

            <RemoteBreadcrumbs path={current} onOpen={(p) => void browser.open(p)} />

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
                  }}
                />
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={creating || !newName.trim()}
                  onClick={() => void handleCreate()}
                >
                  {creating ? '创建中…' : '创建'}
                </button>
              </div>
            )}

            {error && <p className="browser__warn">{error}</p>}

            <div className="browser__list">
              {loading && <div className="browser__loading">读取中…</div>}

              {!loading && folders.length === 0 && (
                <div className="browser__empty-hint">
                  这个目录下没有子目录，可以直接把当前目录作为上传目标
                </div>
              )}

              {!loading &&
                folders.map((folder: RemoteFolder) => {
                  const isTarget = folder.path === value
                  return (
                    <div key={folder.path} className={cn('entry', 'entry--dir', 'r-entry')}>
                      <button
                        type="button"
                        className="r-entry__main"
                        title={folder.path}
                        onClick={() => void browser.open(folder.path)}
                      >
                        <span className="entry__icon entry__icon--dir">
                          <IconFolder size={16} />
                        </span>
                        <span className="entry__name">{folder.name}</span>
                      </button>

                      {folder.pending && (
                        <span className="entry__badge" title="ImageKit 正在建立索引">
                          同步中
                        </span>
                      )}

                      {isTarget && (
                        <span className="r-tag r-tag--target">
                          <IconCheck size={11} />
                          已选
                        </span>
                      )}

                      <span className="r-entry__actions">
                        <button
                          type="button"
                          className={cn('btn', 'btn--sm', isTarget ? 'btn--ghost' : 'btn--primary')}
                          onClick={() => onConfirm(folder.path)}
                        >
                          选中
                        </button>
                      </span>

                      <button
                        type="button"
                        className="icon-btn icon-btn--sm"
                        title="进入该目录"
                        onClick={() => void browser.open(folder.path)}
                      >
                        <IconChevronRight size={14} />
                      </button>
                    </div>
                  )
                })}
            </div>

            <div className="browser__actions">
              <span className="browser__actions-hint">
                当前位置：<code>{current}</code>
              </span>

              <div className="browser__spacer" />

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={!listing || current === '/'}
                onClick={() => onConfirm('/')}
              >
                选根目录
              </button>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={!listing}
                onClick={() => onConfirm(current)}
              >
                <IconTarget size={14} />
                选中当前目录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
