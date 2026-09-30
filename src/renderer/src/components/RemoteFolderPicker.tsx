import { useEffect, useState } from 'react'
import type { RemoteFolder } from '@shared/types'
import { useRemoteBrowser } from '../hooks/useRemoteBrowser'
import type { Toast } from '../hooks/useToasts'
import { useT } from '../lib/i18n'
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
  const t = useT()
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
            <h2>{t('remote.pickerTitle')}</h2>
            <p>{t('remote.pickerSubtitle')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title={t('common.close')}>
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
                {t('common.up')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={loading || current === '/'}
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
                  placeholder={t('common.newFolderPlaceholder')}
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
                  {creating ? t('common.creating') : t('common.create')}
                </button>
              </div>
            )}

            {error && <p className="browser__warn">{error}</p>}

            <div className="browser__list">
              {loading && <div className="browser__loading">{t('common.loading')}</div>}

              {!loading && folders.length === 0 && (
                <div className="browser__empty-hint">{t('remote.pickerEmpty')}</div>
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
                        <span className="entry__badge" title={t('remote.indexBadge')}>
                          {t('common.syncing')}
                        </span>
                      )}

                      {isTarget && (
                        <span className="r-tag r-tag--target">
                          <IconCheck size={11} />
                          {t('remote.pickerSelected')}
                        </span>
                      )}

                      <span className="r-entry__actions">
                        <button
                          type="button"
                          className={cn('btn', 'btn--sm', isTarget ? 'btn--ghost' : 'btn--primary')}
                          onClick={() => onConfirm(folder.path)}
                        >
                          {t('remote.pickerSelect')}
                        </button>
                      </span>

                      <button
                        type="button"
                        className="icon-btn icon-btn--sm"
                        title={t('remote.rowOpenTitle', { path: folder.path })}
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
                {t('remote.pickerCurrent', { path: current })}
              </span>

              <div className="browser__spacer" />

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={!listing || current === '/'}
                onClick={() => onConfirm('/')}
              >
                {t('remote.pickerSelectRoot')}
              </button>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={!listing}
                onClick={() => onConfirm(current)}
              >
                <IconTarget size={14} />
                {t('remote.pickerSelectCurrent')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
