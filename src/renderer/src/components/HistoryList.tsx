import type { HistoryEntry } from '@shared/types'
import { useI18n } from '../lib/i18n'
import { formatBytes, formatRelativeTime, truncateMiddle } from '../lib/utils'
import { IconCopy, IconExternal, IconFile, IconHistory, IconImage, IconTrash } from './Icons'

interface HistoryListProps {
  entries: HistoryEntry[]
  onCopy: (url: string) => void
  onOpen: (url: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

function urlOf(entry: HistoryEntry): string {
  return entry.cdnUrl || entry.url
}

export function HistoryList({ entries, onCopy, onOpen, onRemove, onClear }: HistoryListProps) {
  const { t, locale } = useI18n()

  if (entries.length === 0) {
    return (
      <div className="empty">
        <IconHistory size={28} />
        <p>{t('history.empty')}</p>
        <span>{t('history.emptyHint')}</span>
      </div>
    )
  }

  return (
    <div className="history">
      <div className="history__bar">
        <span>{t('history.count', { n: entries.length })}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
          <IconTrash size={14} />
          {t('history.clear')}
        </button>
      </div>

      <ul className="queue">
        {entries.map((entry) => {
          const url = urlOf(entry)
          return (
            <li key={entry.id} className="queue-row queue-row--success">
              <div className="queue-row__thumb">
                {entry.thumbnailUrl ? (
                  <img src={entry.thumbnailUrl} alt="" draggable={false} loading="lazy" />
                ) : entry.fileType?.startsWith('image/') ? (
                  <IconImage size={20} />
                ) : (
                  <IconFile size={20} />
                )}
              </div>

              <div className="queue-row__main">
                <div className="queue-row__title">
                  <span className="queue-row__name" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="queue-row__time">
                    {formatRelativeTime(entry.uploadedAt, t, locale)}
                  </span>
                </div>
                <button type="button" className="link-btn" onClick={() => onCopy(url)} title={url}>
                  {truncateMiddle(url, 62)}
                </button>
                <p className="queue-row__meta">
                  {entry.filePath}
                  {entry.size ? ` · ${formatBytes(entry.size)}` : ''}
                  {entry.width && entry.height ? ` · ${entry.width}×${entry.height}` : ''}
                </p>
              </div>

              <div className="queue-row__actions">
                <button type="button" className="icon-btn icon-btn--sm" title={t('common.copyLink')} onClick={() => onCopy(url)}>
                  <IconCopy size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" title={t('common.openInBrowser')} onClick={() => onOpen(url)}>
                  <IconExternal size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" title={t('common.deleteRecord')} onClick={() => onRemove(entry.id)}>
                  <IconTrash size={15} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
