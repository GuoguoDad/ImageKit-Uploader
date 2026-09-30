import { useCallback, useRef, useState } from 'react'
import { uid } from '../lib/utils'

export interface Toast {
  id: string
  kind: 'success' | 'error' | 'info'
  message: string
}

const DURATION_MS = 3200

/** 轻量提示条，失败信息停留时间更长 */
export function useToasts(): {
  toasts: Toast[]
  push: (kind: Toast['kind'], message: string) => void
  dismiss: (id: string) => void
} {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (kind: Toast['kind'], message: string) => {
      const id = uid()
      setToasts((prev) => [...prev.slice(-4), { id, kind, message }])
      const timer = setTimeout(
        () => dismiss(id),
        kind === 'error' ? DURATION_MS * 2 : DURATION_MS
      )
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  return { toasts, push, dismiss }
}
