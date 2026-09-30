import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_LANGUAGE, createTranslator, isCanceledMessage, type Language } from '@shared/i18n'
import type {
  AppConfig,
  AppInfo,
  FileMeta,
  HistoryEntry,
  QueueItem
} from '@shared/types'
import { DirectoryBrowser } from './components/DirectoryBrowser'
import { DropZone } from './components/DropZone'
import { Header } from './components/Header'
import { HistoryList } from './components/HistoryList'
import { OptionsBar, type UploadOptions } from './components/OptionsBar'
import { QueueList } from './components/QueueList'
import { RemoteBrowser } from './components/RemoteBrowser'
import { RemoteFolderPicker } from './components/RemoteFolderPicker'
import { SettingsModal } from './components/SettingsModal'
import { Toasts } from './components/Toasts'
import {
  IconCheck,
  IconClose,
  IconCloud,
  IconFolder,
  IconHistory,
  IconUpload
} from './components/Icons'
import { useDirectoryBrowser } from './hooks/useDirectoryBrowser'
import { useRemoteBrowser } from './hooks/useRemoteBrowser'
import { useToasts } from './hooks/useToasts'
import { I18nProvider } from './lib/i18n'
import { applyTheme, watchSystemTheme, type ThemeMode } from './lib/theme'
import { cn, copyText, joinCdnUrl, normalizeRemotePath, uid } from './lib/utils'

const THEME_CYCLE: ThemeMode[] = ['dark', 'light', 'system']

const FALLBACK_OPTIONS: UploadOptions = { folder: '/', tags: '', useUniqueFileName: true }

type Tab = 'queue' | 'history' | 'browser' | 'remote'

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [configPath, setConfigPath] = useState('')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [tab, setTab] = useState<Tab>('queue')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [options, setOptions] = useState<UploadOptions>(FALLBACK_OPTIONS)
  const [concurrency, setConcurrency] = useState(3)
  const [reading, setReading] = useState(false)
  const [remotePickerOpen, setRemotePickerOpen] = useState(false)

  // 界面语言来自配置，默认英文；App 自身在 Provider 之上，因此在这里本地取一份 t
  const lang: Language = config?.language ?? DEFAULT_LANGUAGE
  const t = useMemo(() => createTranslator(lang), [lang])
  const locale = lang === 'zh' ? 'zh-CN' : 'en'

  const { toasts, push, dismiss } = useToasts()
  const browser = useDirectoryBrowser(push)
  const remote = useRemoteBrowser(push, { t, locale })
  const remoteRef = useRef(remote)
  const openDirectory = browser.open

  useEffect(() => {
    remoteRef.current = remote
  }, [remote])

  // 供异步回调读取最新值，避免闭包过期
  const configRef = useRef<AppConfig | null>(null)
  const optionsRef = useRef<UploadOptions>(FALLBACK_OPTIONS)
  const queueRef = useRef<QueueItem[]>([])
  const inFlight = useRef<Set<string>>(new Set())
  const optionsDirty = useRef(false)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  /* ------------------------------ 初始化 ------------------------------ */

  const syncConfig = useCallback((next: AppConfig, forceOptions = false) => {
    setConfig(next)
    configRef.current = next
    setConcurrency(next.concurrency)
    if (forceOptions || !optionsDirty.current) {
      setOptions({
        folder: next.defaultFolder,
        tags: next.defaultTags,
        useUniqueFileName: next.useUniqueFileName
      })
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const [cfgRes, infoRes, histRes] = await Promise.all([
        window.api.config.get(),
        window.api.app.info(),
        window.api.history.list()
      ])
      if (cfgRes.ok) syncConfig(cfgRes.data, true)
      if (infoRes.ok) {
        setAppInfo(infoRes.data)
        setConfigPath(infoRes.data.configPath)
      }
      if (histRes.ok) setHistory(histRes.data)
    })()
  }, [syncConfig])

  /* ------------------------------ 主题 / 语言 ------------------------------ */

  const themeMode: ThemeMode = config?.theme ?? 'dark'

  useEffect(() => {
    applyTheme(themeMode)
    if (themeMode !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [themeMode])

  // 让 <html lang> 跟着界面语言走（影响断行、拼写、无障碍朗读）
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const handleCycleTheme = useCallback(() => {
    const idx = THEME_CYCLE.indexOf(themeMode)
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]
    setConfig((prev) => {
      if (!prev) return prev
      const updated = { ...prev, theme: next }
      configRef.current = updated
      return updated
    })
    void window.api.config.save({ theme: next })
  }, [themeMode])

  /** 切换界面语言：立即生效并写入配置，下次启动沿用 */
  const handleLanguageChange = useCallback((next: Language) => {
    setConfig((prev) => {
      if (!prev || prev.language === next) return prev
      const updated = { ...prev, language: next }
      configRef.current = updated
      return updated
    })
    void window.api.config.save({ language: next })
  }, [])

  const handleToggleLanguage = useCallback(() => {
    handleLanguageChange(lang === 'en' ? 'zh' : 'en')
  }, [handleLanguageChange, lang])

  /* ------------------------------ 上传进度 ------------------------------ */

  useEffect(() => {
    return window.api.ik.onProgress((payload) => {
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== payload.requestId || item.status !== 'uploading') return item
          const total = payload.total || 1
          const ratio = Math.min(1, payload.loaded / total)
          return { ...item, progress: payload.phase === 'processing' ? Math.max(ratio, 0.995) : ratio }
        })
      )
    })
  }, [])

  /* ------------------------------ 添加文件 ------------------------------ */

  const appendMetas = useCallback((metas: FileMeta[]) => {
    setQueue((prev) => {
      const known = new Set(prev.map((i) => i.path))
      const next = [...prev]
      for (const meta of metas) {
        if (known.has(meta.path)) continue
        known.add(meta.path)
        next.push({
          id: uid(),
          path: meta.path,
          name: meta.name,
          size: meta.size,
          type: meta.type,
          thumbnail: meta.thumbnail,
          status: 'pending',
          progress: 0
        })
      }
      return next
    })
  }, [])

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setReading(true)
      try {
        const rawPaths: string[] = []
        const blobs: File[] = []

        for (const file of files) {
          let path = ''
          try {
            path = window.api.files.pathForFile(file)
          } catch {
            path = ''
          }
          if (path) rawPaths.push(path)
          else blobs.push(file)
        }

        const metas: FileMeta[] = []

        if (rawPaths.length > 0) {
          // 拖进来的可能是目录：目录转到目录浏览，文件才进队列
          const classified = await window.api.fs.classify(rawPaths)
          if (classified.ok) {
            const { files: filePaths, dirs } = classified.data

            if (dirs.length > 0) {
              await openDirectory(dirs[0])
              setTab('browser')
              if (dirs.length > 1) {
                push('info', t('toast.dirsDropped', { n: dirs.length }))
              } else if (filePaths.length === 0) {
                push('info', t('toast.dirOpened', { path: dirs[0] }))
              }
            }

            if (filePaths.length > 0) {
              const res = await window.api.files.describe(filePaths)
              if (res.ok) metas.push(...res.data)
            }
          } else {
            push('error', classified.error)
          }
        }

        // 剪贴板截图 / 无真实路径的文件：先落盘到临时目录
        for (const blob of blobs) {
          const buffer = await blob.arrayBuffer()
          const res = await window.api.files.saveTemp(blob.name || 'clipboard.png', buffer)
          if (res.ok) metas.push(res.data)
          else push('error', res.error)
        }

        if (metas.length === 0) {
          if (rawPaths.length === 0 && blobs.length === 0) {
            push('info', t('toast.noUploadable'))
          }
          return
        }
        appendMetas(metas)
      } catch (err) {
        push('error', err instanceof Error ? err.message : String(err))
      } finally {
        setReading(false)
      }
    },
    [appendMetas, openDirectory, push, t]
  )

  const handlePick = useCallback(async () => {
    setReading(true)
    try {
      const res = await window.api.files.pick()
      if (!res.ok) {
        push('error', res.error)
        return
      }
      if (res.data.length > 0) appendMetas(res.data)
    } finally {
      setReading(false)
    }
  }, [appendMetas, push])

  /* ------------------------------ 目录浏览 ------------------------------ */

  /** 选择文件夹后切到目录浏览标签页 */
  const handlePickFolder = useCallback(async () => {
    const dir = await browser.pick()
    if (dir) setTab('browser')
  }, [browser])

  /** 把一批本地路径加入上传队列 */
  const handleAddPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) {
        push('info', t('toast.nothingToAdd'))
        return
      }
      setReading(true)
      try {
        const res = await window.api.files.describe(paths)
        if (!res.ok) {
          push('error', res.error)
          return
        }
        if (res.data.length === 0) {
          push('info', t('toast.nothingToAdd'))
          return
        }
        appendMetas(res.data)
        push('success', t('toast.added', { n: res.data.length }))
        setTab('queue')
      } finally {
        setReading(false)
      }
    },
    [appendMetas, push, t]
  )

  const handleAddSelected = useCallback(
    (paths: string[]) => {
      void handleAddPaths(paths)
    },
    [handleAddPaths]
  )

  // 支持 ⌘/Ctrl + V 粘贴图片
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      void addFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  /* ------------------------------ 执行上传 ------------------------------ */

  const runUpload = useCallback(
    async (item: QueueItem) => {
      const cfg = configRef.current
      const opts = optionsRef.current

      if (!cfg) {
        inFlight.current.delete(item.id)
        return
      }

      if (!cfg.publicKey || !cfg.privateKey) {
        inFlight.current.delete(item.id)
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', error: t('toast.missingKeys') }
              : i
          )
        )
        push('error', t('toast.fillCredentials'))
        setSettingsOpen(true)
        return
      }

      setQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'uploading', progress: 0, error: undefined } : i
        )
      )

      const tags = opts.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await window.api.ik.upload({
        requestId: item.id,
        filePath: item.path,
        fileName: item.name,
        folder: opts.folder,
        tags,
        useUniqueFileName: opts.useUniqueFileName
      })

      inFlight.current.delete(item.id)

      if (res.ok) {
        const cdnUrl = res.data.cdnUrl || joinCdnUrl(cfg.urlEndpoint, res.data.filePath, res.data.url)
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'success', progress: 1, result: { ...res.data, cdnUrl } }
              : i
          )
        )
        push('success', t('toast.uploaded', { name: item.name }))
        const hist = await window.api.history.list()
        if (hist.ok) setHistory(hist.data)
        // 上传成功后刷新云端目录，让新文件立刻出现在列表里
        if (remoteRef.current.listing) void remoteRef.current.refresh({ silent: true })
      } else {
        const canceled = isCanceledMessage(res.error)
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: canceled ? 'canceled' : 'error', error: res.error }
              : i
          )
        )
        if (!canceled) push('error', t('toast.uploadFailed', { name: item.name, error: res.error }))
      }
    },
    [push, t]
  )

  // 并发调度：有空闲槽位时自动启动排队中的任务
  useEffect(() => {
    const active = queue.filter((i) => i.status === 'uploading').length
    const slots = Math.max(0, concurrency - active)
    if (slots === 0) return

    const pending = queue
      .filter((i) => i.status === 'pending' && !inFlight.current.has(i.id))
      .slice(0, slots)

    for (const item of pending) {
      inFlight.current.add(item.id)
      void runUpload(item)
    }
  }, [queue, concurrency, runUpload])

  /* ------------------------------ 队列操作 ------------------------------ */

  const handleCancel = useCallback(async (id: string) => {
    await window.api.ik.cancel(id)
  }, [])

  const handleRetry = useCallback((id: string) => {
    inFlight.current.delete(id)
    setQueue((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'pending', progress: 0, error: undefined } : i))
    )
  }, [])

  const handleRemove = useCallback((id: string) => {
    inFlight.current.delete(id)
    setQueue((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleUploadAll = useCallback(() => {
    setQueue((prev) =>
      prev.map((i) =>
        i.status === 'error' || i.status === 'canceled'
          ? { ...i, status: 'pending', progress: 0, error: undefined }
          : i
      )
    )
  }, [])

  const handleClearDone = useCallback(() => {
    setQueue((prev) => prev.filter((i) => i.status !== 'success' && i.status !== 'canceled'))
  }, [])

  /* ------------------------------ 复制 / 打开 ------------------------------ */

  const handleCopy = useCallback(
    async (item: QueueItem, kind: 'url' | 'markdown' | 'html') => {
      const url = item.result?.cdnUrl || item.result?.url
      if (!url) return
      const text =
        kind === 'url'
          ? url
          : kind === 'markdown'
            ? `![${item.name}](${url})`
            : `<img src="${url}" alt="${item.name}" />`
      const done = await copyText(text)
      push(done ? 'success' : 'error', done ? t('common.copied') : t('common.copyFailed'))
    },
    [push, t]
  )

  const handleCopyAll = useCallback(async () => {
    const urls = queueRef.current
      .filter((i) => i.status === 'success')
      .map((i) => i.result?.cdnUrl || i.result?.url)
      .filter((u): u is string => Boolean(u))
    if (urls.length === 0) {
      push('info', t('toast.noUploadsYet'))
      return
    }
    const done = await copyText(urls.join('\n'))
    push(done ? 'success' : 'error', done ? t('toast.copiedLinks', { n: urls.length }) : t('common.copyFailedShort'))
  }, [push, t])

  const handleCopyOne = useCallback(
    async (url: string) => {
      const done = await copyText(url)
      push(done ? 'success' : 'error', done ? t('common.copied') : t('common.copyFailedShort'))
    },
    [push, t]
  )

  const handleOpenUrl = useCallback((url: string) => {
    if (url) void window.api.shell.openExternal(url)
  }, [])

  const handleReveal = useCallback((path: string) => {
    void window.api.shell.showItem(path)
  }, [])

  /* ------------------------------ 历史记录 ------------------------------ */

  const handleRemoveHistory = useCallback(async (id: string) => {
    const res = await window.api.history.remove(id)
    if (res.ok) setHistory(res.data)
  }, [])

  const handleClearHistory = useCallback(async () => {
    const res = await window.api.history.clear()
    if (res.ok) {
      setHistory(res.data)
      push('success', t('toast.historyCleared'))
    }
  }, [push, t])

  /* ------------------------------ 设置 ------------------------------ */

  const handleSaveConfig = useCallback(
    async (patch: Partial<AppConfig>) => {
      const res = await window.api.config.save(patch)
      if (!res.ok) {
        push('error', res.error)
        return
      }
      optionsDirty.current = false
      syncConfig(res.data, true)
      setAppInfo((prev) =>
        prev
          ? { ...prev, configured: Boolean(res.data.publicKey && res.data.privateKey) }
          : prev
      )
      push('success', t('toast.configSaved'))
    },
    [push, syncConfig, t]
  )

  const handleReloadConfig = useCallback(async () => {
    const res = await window.api.config.reload()
    if (!res.ok) {
      push('error', res.error)
      return
    }
    optionsDirty.current = false
    syncConfig(res.data, true)
    setAppInfo((prev) =>
      prev ? { ...prev, configured: Boolean(res.data.publicKey && res.data.privateKey) } : prev
    )
    push('success', t('toast.configReloaded'))
  }, [push, syncConfig, t])

  const handleTest = useCallback(async (): Promise<string> => {
    const res = await window.api.ik.test()
    if (!res.ok) throw new Error(res.error)
    return res.data.message
  }, [])

  const handleOptionsChange = useCallback((part: Partial<UploadOptions>) => {
    optionsDirty.current = true
    setOptions((prev) => ({ ...prev, ...part }))
  }, [])

  const handleConcurrencyChange = useCallback((value: number) => {
    optionsDirty.current = true
    const clamped = Math.min(8, Math.max(1, Number.isFinite(value) ? Math.floor(value) : 3))
    setConcurrency(clamped)
    void window.api.config.save({ concurrency: clamped })
  }, [])

  /* ------------------------------ 统计 ------------------------------ */

  const stats = useMemo(() => {
    const done = queue.filter((i) => i.status === 'success').length
    const failed = queue.filter((i) => i.status === 'error').length
    const running = queue.filter((i) => i.status === 'uploading').length
    const waiting = queue.filter((i) => i.status === 'pending').length
    return { done, failed, running, waiting, total: queue.length }
  }, [queue])

  const configured = Boolean(config?.publicKey && config?.privateKey)
  const busy = reading

  /* ------------------------------ 云端目录 ------------------------------ */

  /** 把某个云端目录设为本次上传目标（选中同一目录时不重复提示） */
  const handleSelectRemoteTarget = useCallback(
    (path: string) => {
      const next = normalizeRemotePath(path)
      if (normalizeRemotePath(options.folder) === next) return
      handleOptionsChange({ folder: next })
      push('success', t('toast.targetSet', { path: next }))
    },
    [handleOptionsChange, options.folder, push, t]
  )

  const handleCopyText = useCallback(
    async (text: string, label: string) => {
      const done = await copyText(text)
      push(done ? 'success' : 'error', done ? t('toast.copiedLabel', { label }) : t('common.copyFailed'))
    },
    [push, t]
  )

  const handleRemotePicked = useCallback(
    (path: string) => {
      setRemotePickerOpen(false)
      handleSelectRemoteTarget(path)
    },
    [handleSelectRemoteTarget]
  )

  // 切到「云端目录」标签且已配置凭证时，自动打开根目录（只自动尝试一次）
  const remoteAutoOpened = useRef(false)
  useEffect(() => {
    if (tab !== 'remote' || !configured) return
    if (remoteAutoOpened.current) return
    if (remote.listing || remote.loading) return
    remoteAutoOpened.current = true
    void remote.open('/')
  }, [tab, configured, remote.listing, remote.loading, remote.open])

  return (
    <I18nProvider lang={lang}>
      <div className="app">
        <Header
          name={config?.name || 'ImageKit Uploader'}
          appInfo={appInfo}
          themeMode={themeMode}
          lang={lang}
          onCycleTheme={handleCycleTheme}
          onToggleLanguage={handleToggleLanguage}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {config && !configured && (
          <div className="banner">
            <span>{t('app.banner')}</span>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setSettingsOpen(true)}>
              {t('app.configureNow')}
            </button>
          </div>
        )}

        <main className="app-main">
          <DropZone
            disabled={busy}
            busy={busy}
            onPick={handlePick}
            onPickFolder={handlePickFolder}
            onFiles={addFiles}
          />

          <OptionsBar
            options={options}
            concurrency={concurrency}
            disabled={busy}
            onBrowseRemote={() => {
              if (!configured) {
                push('info', t('toast.fillCredentials'))
                setSettingsOpen(true)
                return
              }
              setRemotePickerOpen(true)
            }}
            onChange={handleOptionsChange}
            onConcurrencyChange={handleConcurrencyChange}
          />

          <section className="panel">
            <div className="panel__head">
              <div className="tabs">
                <button
                  type="button"
                  className={cn('tab', tab === 'queue' && 'tab--active')}
                  onClick={() => setTab('queue')}
                >
                  <IconUpload size={15} />
                  {t('app.tab.queue')}
                  {queue.length > 0 && <b>{queue.length}</b>}
                </button>
                <button
                  type="button"
                  className={cn('tab', tab === 'history' && 'tab--active')}
                  onClick={() => setTab('history')}
                >
                  <IconHistory size={15} />
                  {t('app.tab.history')}
                  {history.length > 0 && <b>{history.length}</b>}
                </button>
                <button
                  type="button"
                  className={cn('tab', tab === 'browser' && 'tab--active')}
                  onClick={() => setTab('browser')}
                >
                  <IconFolder size={15} />
                  {t('app.tab.local')}
                  {browser.listing && <b>{browser.listing.total}</b>}
                </button>
                <button
                  type="button"
                  className={cn('tab', tab === 'remote' && 'tab--active')}
                  onClick={() => setTab('remote')}
                >
                  <IconCloud size={15} />
                  {t('app.tab.remote')}
                  {remote.listing && <b>{remote.folders.length + remote.listing.files.length}</b>}
                </button>
              </div>

              {tab === 'queue' && queue.length > 0 && (
                <div className="panel__tools">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleUploadAll}>
                    <IconUpload size={14} />
                    {t('app.tool.uploadAll')}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopyAll}>
                    {t('app.tool.copyAllLinks')}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleClearDone}>
                    <IconClose size={14} />
                    {t('app.tool.clearDone')}
                  </button>
                </div>
              )}
            </div>

            <div className={cn('panel__body', (tab === 'browser' || tab === 'remote') && 'panel__body--flush')}>
              {tab === 'queue' && (
                <QueueList
                  items={queue}
                  onUpload={handleRetry}
                  onCancel={handleCancel}
                  onRetry={handleRetry}
                  onRemove={handleRemove}
                  onCopy={handleCopy}
                  onOpen={handleOpenUrl}
                  onReveal={handleReveal}
                />
              )}

              {tab === 'history' && (
                <HistoryList
                  entries={history}
                  onCopy={handleCopyOne}
                  onOpen={handleOpenUrl}
                  onRemove={handleRemoveHistory}
                  onClear={handleClearHistory}
                />
              )}

              {tab === 'browser' && (
                <DirectoryBrowser browser={browser} onAdd={handleAddSelected} />
              )}

              {tab === 'remote' && (
                <RemoteBrowser
                  browser={remote}
                  configured={configured}
                  targetFolder={options.folder}
                  onSelectTarget={handleSelectRemoteTarget}
                  onCopy={handleCopyText}
                  onOpenUrl={handleOpenUrl}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              )}
            </div>
          </section>
        </main>

        <footer className="app-foot">
          <span>
            {t('app.foot.queue', { total: stats.total })}
            {stats.waiting > 0 && t('app.foot.waiting', { n: stats.waiting })}
            {stats.running > 0 && t('app.foot.running', { n: stats.running })}
            {stats.done > 0 && t('app.foot.done', { n: stats.done })}
            {stats.failed > 0 && t('app.foot.failed', { n: stats.failed })}
          </span>
          <span className="app-foot__right">
            {stats.done > 0 && (
              <span className="foot-ok">
                <IconCheck size={13} />
                {t('app.foot.uploaded', { n: stats.done })}
              </span>
            )}
            <button
              type="button"
              className="link-btn link-btn--sm"
              title={configPath}
              onClick={() => void window.api.config.openFile()}
            >
              {t('app.foot.configFile')}
            </button>
          </span>
        </footer>

        {config && (
          <SettingsModal
            open={settingsOpen}
            config={config}
            configPath={configPath}
            language={lang}
            onClose={() => setSettingsOpen(false)}
            onSave={handleSaveConfig}
            onReload={handleReloadConfig}
            onOpenConfigFile={() => void window.api.config.openFile()}
            onTest={handleTest}
            onLanguageChange={handleLanguageChange}
          />
        )}

        <RemoteFolderPicker
          open={remotePickerOpen}
          value={options.folder}
          push={push}
          onClose={() => setRemotePickerOpen(false)}
          onConfirm={handleRemotePicked}
        />

        <Toasts toasts={toasts} onDismiss={dismiss} />
      </div>
    </I18nProvider>
  )
}
