import type { MessageKey } from '@shared/i18n'
import type { QueueItem } from '@shared/types'
import { useT } from '../lib/i18n'
import { cn, formatBytes, truncateMiddle } from '../lib/utils'
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconExternal,
  IconFile,
  IconImage,
  IconRefresh,
  IconStop,
  IconTrash
} from './Icons'

interface QueueListProps {
  items: QueueItem[]
  onUpload: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  onCopy: (item: QueueItem, kind: 'url' | 'markdown' | 'html') => void
  onOpen: (url: string) => void
  onReveal: (path: string) => void
}

const STATUS_KEY: Record<QueueItem['status'], MessageKey> = {
  pending: 'queue.status.pending',
  uploading: 'queue.status.uploading',
  success: 'queue.status.success',
  error: 'queue.status.error',
  canceled: 'queue.status.canceled'
}

function remoteUrl(item: QueueItem): string {
  return item.result?.cdnUrl || item.result?.url || ''
}

function QueueRow({
  item,
  onUpload,
  onCancel,
  onRetry,
  onRemove,
  onCopy,
  onOpen,
  onReveal
}: Omit<QueueListProps, 'items'> & { item: QueueItem }) {
  const t = useT()
  const percent = Math.round(item.progress * 100)
  const url = remoteUrl(item)

  return (
    <li className={cn('queue-row', `queue-row--${item.status}`)}>
      <div className="queue-row__thumb" title={item.path} onClick={() => onReveal(item.path)}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" draggable={false} />
        ) : item.type.startsWith('image/') ? (
          <IconImage size={20} />
        ) : (
          <IconFile size={20} />
        )}
      </div>

      <div className="queue-row__main">
        <div className="queue-row__title">
          <span className="queue-row__name" title={item.name}>
            {item.name}
          </span>
          <span className={cn('status-tag', `status-tag--${item.status}`)}>
            {item.status === 'success' && <IconCheck size={12} />}
            {item.status === 'error' && <IconClose size={12} />}
            {t(STATUS_KEY[item.status])}
            {item.status === 'uploading' && ` ${percent}%`}
          </span>
        </div>

        {item.status === 'uploading' && (
          <div className="progress">
            <div className="progress__bar" style={{ width: `${Math.max(percent, 2)}%` }} />
          </div>
        )}

        {item.status === 'success' && url ? (
          <button type="button" className="link-btn" onClick={() => onCopy(item, 'url')} title={url}>
            {truncateMiddle(url, 62)}
          </button>
        ) : item.status === 'error' ? (
          <p className="queue-row__error" title={item.error}>
            {item.error}
          </p>
        ) : (
          <p className="queue-row__meta">
            {formatBytes(item.size)}
            {item.status === 'pending' ? t('queue.queuedNote') : ''}
          </p>
        )}
      </div>

      <div className="queue-row__actions">
        {item.status === 'pending' && (
          <>
            <button type="button" className="icon-btn icon-btn--sm" title={t('queue.uploadNow')} onClick={() => onUpload(item.id)}>
              <IconRefresh size={15} />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" title={t('common.remove')} onClick={() => onRemove(item.id)}>
              <IconTrash size={15} />
            </button>
          </>
        )}

        {item.status === 'uploading' && (
          <button type="button" className="icon-btn icon-btn--sm" title={t('queue.cancelUpload')} onClick={() => onCancel(item.id)}>
            <IconStop size={15} />
          </button>
        )}

        {item.status === 'success' && (
          <>
            <button type="button" className="icon-btn icon-btn--sm" title={t('common.copyLink')} onClick={() => onCopy(item, 'url')}>
              <IconCopy size={15} />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" title={t('common.openInBrowser')} onClick={() => onOpen(url)}>
              <IconExternal size={15} />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" title={t('common.remove')} onClick={() => onRemove(item.id)}>
              <IconTrash size={15} />
            </button>
          </>
        )}

        {(item.status === 'error' || item.status === 'canceled') && (
          <>
            <button type="button" className="icon-btn icon-btn--sm" title={t('common.retry')} onClick={() => onRetry(item.id)}>
              <IconRefresh size={15} />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" title={t('common.remove')} onClick={() => onRemove(item.id)}>
              <IconTrash size={15} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export function QueueList(props: QueueListProps) {
  const t = useT()
  const { items } = props

  if (items.length === 0) {
    return (
      <div className="empty">
        <IconImage size={28} />
        <p>{t('queue.empty')}</p>
        <span>{t('queue.emptyHint')}</span>
      </div>
    )
  }

  return (
    <ul className="queue">
      {items.map((item) => (
        <QueueRow key={item.id} {...props} item={item} />
      ))}
    </ul>
  )
}
