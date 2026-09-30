import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import type { HistoryEntry } from '@shared/types'

const HISTORY_FILE = 'history.json'
const MAX_ENTRIES = 300

function historyPath(): string {
  return join(app.getPath('userData'), HISTORY_FILE)
}

/** 读取上传历史（最多 300 条，最新的排在最前） */
export function loadHistory(): HistoryEntry[] {
  try {
    const path = historyPath()
    if (!existsSync(path)) return []
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(raw) ? (raw as HistoryEntry[]) : []
  } catch (err) {
    console.error('[history] 读取历史失败：', err)
    return []
  }
}

function persist(entries: HistoryEntry[]): void {
  const path = historyPath()
  mkdirSync(join(path, '..'), { recursive: true })
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(entries.slice(0, MAX_ENTRIES), null, 2), 'utf8')
  renameSync(tmp, path)
}

export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const entries = loadHistory().filter((e) => e.id !== entry.id)
  entries.unshift(entry)
  const trimmed = entries.slice(0, MAX_ENTRIES)
  persist(trimmed)
  return trimmed
}

export function removeHistory(id: string): HistoryEntry[] {
  const entries = loadHistory().filter((e) => e.id !== id)
  persist(entries)
  return entries
}

export function clearHistory(): HistoryEntry[] {
  persist([])
  return []
}
