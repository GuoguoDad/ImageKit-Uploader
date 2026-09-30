import type { Toast } from '../hooks/useToasts'
import { IconCheck, IconClose } from './Icons'

interface ToastsProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  if (toasts.length === 0) return null

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`}>
          {toast.kind === 'error' ? <IconClose size={15} /> : <IconCheck size={15} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => onDismiss(toast.id)} title="关闭">
            <IconClose size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
