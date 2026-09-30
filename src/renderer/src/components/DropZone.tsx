import { useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { IconFolderOpen, IconUpload } from './Icons'

interface DropZoneProps {
  disabled?: boolean
  busy?: boolean
  onPick: () => void
  onPickFolder: () => void
  onFiles: (files: File[]) => void
}

/** 拖拽 / 点击 / 粘贴 三种方式添加文件，也可直接挑一个目录去浏览 */
export function DropZone({ disabled, busy, onPick, onPickFolder, onFiles }: DropZoneProps) {
  const [active, setActive] = useState(false)
  const depth = useRef(0)

  const handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault()
    depth.current += 1
    if (!disabled) setActive(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    depth.current -= 1
    if (depth.current <= 0) {
      depth.current = 0
      setActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    depth.current = 0
    setActive(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length > 0) onFiles(files)
  }

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!disabled) handler()
  }

  return (
    <div
      className={cn('dropzone', active && 'dropzone--active', disabled && 'dropzone--disabled')}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && onPick()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onPick()
      }}
    >
      <span className="dropzone__icon">
        <IconUpload size={26} />
      </span>
      <div className="dropzone__text">
        <strong>{busy ? '正在读取文件…' : '拖拽文件或文件夹到这里'}</strong>
        <span>
          或点击选择文件 · 支持 <kbd>⌘/Ctrl</kbd> + <kbd>V</kbd> 粘贴剪贴板图片
        </span>
      </div>

      <div className="dropzone__actions">
        <button type="button" className="btn btn--sm" onClick={stop(onPick)}>
          选择文件
        </button>
        <button type="button" className="btn btn--sm" onClick={stop(onPickFolder)}>
          <IconFolderOpen size={14} />
          选择文件夹
        </button>
      </div>
    </div>
  )
}
