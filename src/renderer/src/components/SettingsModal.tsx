import type { AppConfig } from '@shared/types'
import { useEffect, useState } from 'react'
import { cn } from '../lib/utils'
import { IconClose, IconExternal, IconRefresh } from './Icons'

interface SettingsModalProps {
  open: boolean
  config: AppConfig
  configPath: string
  onClose: () => void
  onSave: (patch: Partial<AppConfig>) => Promise<void>
  onReload: () => void
  onOpenConfigFile: () => void
  onTest: (draft: Partial<AppConfig>) => Promise<string>
}

interface DraftState {
  name: string
  publicKey: string
  privateKey: string
  urlEndpoint: string
  defaultFolder: string
  defaultTags: string
  useUniqueFileName: boolean
  concurrency: number
  customEndpoint: string
  apiEndpoint: string
}

function toDraft(config: AppConfig): DraftState {
  return {
    name: config.name,
    publicKey: config.publicKey,
    privateKey: config.privateKey,
    urlEndpoint: config.urlEndpoint,
    defaultFolder: config.defaultFolder,
    defaultTags: config.defaultTags,
    useUniqueFileName: config.useUniqueFileName,
    concurrency: config.concurrency,
    customEndpoint: config.customEndpoint,
    apiEndpoint: config.apiEndpoint
  }
}

export function SettingsModal({
  open,
  config,
  configPath,
  onClose,
  onSave,
  onReload,
  onOpenConfigFile,
  onTest
}: SettingsModalProps) {
  const [draft, setDraft] = useState<DraftState>(() => toDraft(config))
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // 每次打开都同步一次磁盘上的最新配置
  useEffect(() => {
    if (open) {
      setDraft(toDraft(config))
      setTestMessage(null)
      setShowSecret(false)
    }
  }, [open, config])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const patch = (part: Partial<DraftState>): void => setDraft((prev) => ({ ...prev, ...part }))

  const filled = Boolean(draft.publicKey.trim() && draft.privateKey.trim())

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setTestMessage(null)
    try {
      await onSave(draft)
      const message = await onTest(draft)
      setTestMessage({ ok: true, text: message })
    } catch (err) {
      setTestMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await onSave(draft)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <div>
            <h2>设置</h2>
            <p>凭证会写入本机配置文件，后期可直接编辑该文件调整</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="关闭">
            <IconClose size={17} />
          </button>
        </div>

        <div className="modal__body">
          <section className="form-section">
            <h3 className="form-section__title">ImageKit 凭证</h3>

            <label className="form-row">
              <span className="form-row__label">
                Name
                <em>工具显示名称 / 账号标识</em>
              </span>
              <input
                className="input"
                value={draft.name}
                spellCheck={false}
                placeholder="ImageKit Uploader"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>

            <label className="form-row">
              <span className="form-row__label">
                Public Key
                <em>Developer Options → API Keys</em>
              </span>
              <input
                className="input input--mono"
                value={draft.publicKey}
                spellCheck={false}
                autoComplete="off"
                placeholder="public_xxxxxxxx"
                onChange={(e) => patch({ publicKey: e.target.value })}
              />
            </label>

            <label className="form-row">
              <span className="form-row__label">
                Private Key
                <em>仅保存在本机，用于生成上传签名</em>
              </span>
              <div className="input-group">
                <input
                  className="input input--mono"
                  type={showSecret ? 'text' : 'password'}
                  value={draft.privateKey}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="private_xxxxxxxx"
                  onChange={(e) => patch({ privateKey: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? '隐藏' : '显示'}
                </button>
              </div>
            </label>

            <label className="form-row">
              <span className="form-row__label">
                URL Endpoint
                <em>用于拼接最终访问链接</em>
              </span>
              <input
                className="input input--mono"
                value={draft.urlEndpoint}
                spellCheck={false}
                placeholder="https://ik.imagekit.io/your_imagekit_id"
                onChange={(e) => patch({ urlEndpoint: e.target.value })}
              />
            </label>

            {testMessage && (
              <p className={cn('inline-msg', testMessage.ok ? 'inline-msg--ok' : 'inline-msg--err')}>
                {testMessage.text}
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!filled || testing}
                onClick={handleTest}
              >
                <IconRefresh size={15} />
                {testing ? '检测中…' : '保存并测试连接'}
              </button>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">上传默认值</h3>

            <div className="form-grid">
              <label className="form-row">
                <span className="form-row__label">默认目录</span>
                <input
                  className="input"
                  value={draft.defaultFolder}
                  spellCheck={false}
                  placeholder="/uploads"
                  onChange={(e) => patch({ defaultFolder: e.target.value })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">默认标签</span>
                <input
                  className="input"
                  value={draft.defaultTags}
                  spellCheck={false}
                  placeholder="逗号分隔"
                  onChange={(e) => patch({ defaultTags: e.target.value })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">并发上传数</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={8}
                  value={draft.concurrency}
                  onChange={(e) => patch({ concurrency: Number(e.target.value) })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">自定义上传端点</span>
                <input
                  className="input input--mono"
                  value={draft.customEndpoint}
                  spellCheck={false}
                  placeholder="留空使用官方端点"
                  onChange={(e) => patch({ customEndpoint: e.target.value })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">管理 API 地址</span>
                <input
                  className="input input--mono"
                  value={draft.apiEndpoint}
                  spellCheck={false}
                  placeholder="留空使用 https://api.imagekit.io/v1"
                  onChange={(e) => patch({ apiEndpoint: e.target.value })}
                />
              </label>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={draft.useUniqueFileName}
                onChange={(e) => patch({ useUniqueFileName: e.target.checked })}
              />
              <span>默认启用唯一文件名（避免同名覆盖）</span>
            </label>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">配置文件</h3>
            <p className="form-hint">修改该文件并保存后，点击「重新加载配置」即可生效，无需重启。</p>
            <code className="path-box">{configPath}</code>
            <div className="form-actions form-actions--wrap">
              <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenConfigFile}>
                <IconExternal size={14} />
                打开配置文件
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onReload}>
                <IconRefresh size={14} />
                重新加载配置
              </button>
            </div>
          </section>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSave}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
