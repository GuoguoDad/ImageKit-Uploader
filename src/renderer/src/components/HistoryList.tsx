import type { HistoryEntry } from '@shared/types'
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
  if (entries.length === 0) {
    return (
      <div className="empty">
        <IconHistory size={28} />
        <p>暂无上传记录</p>
        <span>成功上传的文件会保存在这里，最多 300 条</span>
      </div>
    )
  }

  return (
    <div className="history">
      <div className="history__bar">
        <span>共 {entries.length} 条记录</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
          <IconTrash size={14} />
          清空记录
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
                  <span className="queue-row__time">{formatRelativeTime(entry.uploadedAt)}</span>
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
                <button type="button" className="icon-btn icon-btn--sm" title="复制链接" onClick={() => onCopy(url)}>
                  <IconCopy size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" title="在浏览器打开" onClick={() => onOpen(url)}>
                  <IconExternal size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" title="删除记录" onClick={() => onRemove(entry.id)}>
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
