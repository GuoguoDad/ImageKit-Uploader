import { LANGUAGE_LABELS, type Language } from '@shared/i18n'
import type { AppConfig } from '@shared/types'
import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'
import { cn } from '../lib/utils'
import { IconClose, IconExternal, IconRefresh } from './Icons'

interface SettingsModalProps {
  open: boolean
  config: AppConfig
  configPath: string
  /** 当前界面语言 */
  language: Language
  onClose: () => void
  onSave: (patch: Partial<AppConfig>) => Promise<void>
  onReload: () => void
  onOpenConfigFile: () => void
  onTest: (draft: Partial<AppConfig>) => Promise<string>
  /** 切换界面语言（立即生效并持久化） */
  onLanguageChange: (lang: Language) => void
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
  language,
  onClose,
  onSave,
  onReload,
  onOpenConfigFile,
  onTest,
  onLanguageChange
}: SettingsModalProps) {
  const t = useT()
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
            <h2>{t('settings.title')}</h2>
            <p>{t('settings.subtitle')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title={t('common.close')}>
            <IconClose size={17} />
          </button>
        </div>

        <div className="modal__body">
          <section className="form-section">
            <h3 className="form-section__title">{t('settings.appearance')}</h3>

            <div className="form-row">
              <span className="form-row__label">
                {t('language.label')}
                <em>{t('language.hint')}</em>
              </span>
              <div className="segmented" role="group" aria-label={t('language.label')}>
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={cn('segmented__item', code === language && 'segmented__item--active')}
                    aria-pressed={code === language}
                    onClick={() => onLanguageChange(code)}
                  >
                    {LANGUAGE_LABELS[code]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">{t('settings.credentials')}</h3>

            <label className="form-row">
              <span className="form-row__label">
                Name
                <em>{t('settings.nameHint')}</em>
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
                <em>{t('settings.privateHint')}</em>
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
                  {showSecret ? t('settings.hide') : t('settings.show')}
                </button>
              </div>
            </label>

            <label className="form-row">
              <span className="form-row__label">
                URL Endpoint
                <em>{t('settings.urlHint')}</em>
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
                {testing ? t('settings.testing') : t('settings.saveAndTest')}
              </button>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">{t('settings.defaults')}</h3>

            <div className="form-grid">
              <label className="form-row">
                <span className="form-row__label">{t('settings.defaultFolder')}</span>
                <input
                  className="input"
                  value={draft.defaultFolder}
                  spellCheck={false}
                  placeholder="/uploads"
                  onChange={(e) => patch({ defaultFolder: e.target.value })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">{t('settings.defaultTags')}</span>
                <input
                  className="input"
                  value={draft.defaultTags}
                  spellCheck={false}
                  placeholder={t('settings.tagsPlaceholder')}
                  onChange={(e) => patch({ defaultTags: e.target.value })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">{t('settings.concurrency')}</span>
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
                <span className="form-row__label">{t('settings.customEndpoint')}</span>
                <input
                  className="input input--mono"
                  value={draft.customEndpoint}
                  spellCheck={false}
                  placeholder={t('settings.customEndpointPlaceholder')}
                  onChange={(e) => patch({ customEndpoint: e.target.value })}
                />
              </label>

              <label className="form-row">
                <span className="form-row__label">{t('settings.apiEndpoint')}</span>
                <input
                  className="input input--mono"
                  value={draft.apiEndpoint}
                  spellCheck={false}
                  placeholder={t('settings.apiEndpointPlaceholder')}
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
              <span>{t('settings.uniqueDefault')}</span>
            </label>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">{t('settings.configFile')}</h3>
            <p className="form-hint">{t('settings.configHint')}</p>
            <code className="path-box">{configPath}</code>
            <div className="form-actions form-actions--wrap">
              <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenConfigFile}>
                <IconExternal size={14} />
                {t('settings.openFile')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onReload}>
                <IconRefresh size={14} />
                {t('settings.reload')}
              </button>
            </div>
          </section>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSave}>
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
