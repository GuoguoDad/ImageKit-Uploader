import { useT } from '../lib/i18n'
import { IconCloud, IconFolder, IconTag } from './Icons'

export interface UploadOptions {
  folder: string
  tags: string
  useUniqueFileName: boolean
}

interface OptionsBarProps {
  options: UploadOptions
  concurrency: number
  disabled?: boolean
  /** 打开云端目录选择器，挑选上传目标目录 */
  onBrowseRemote?: () => void
  onChange: (patch: Partial<UploadOptions>) => void
  onConcurrencyChange: (value: number) => void
}

/** 本次上传的参数：目录、标签、是否生成唯一文件名、并发数 */
export function OptionsBar({
  options,
  concurrency,
  disabled,
  onBrowseRemote,
  onChange,
  onConcurrencyChange
}: OptionsBarProps) {
  const t = useT()

  return (
    <div className="options-bar">
      <div className="field field--inline field--grow">
        <IconFolder size={15} />
        <label className="field__label" htmlFor="opt-folder">
          {t('opt.folder')}
        </label>
        <input
          id="opt-folder"
          className="input"
          value={options.folder}
          placeholder="/uploads"
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => onChange({ folder: e.target.value })}
        />
        {onBrowseRemote && (
          <button
            type="button"
            className="btn btn--ghost btn--sm field__btn"
            disabled={disabled}
            title={t('opt.browseTitle')}
            onClick={onBrowseRemote}
          >
            <IconCloud size={14} />
            {t('opt.browse')}
          </button>
        )}
      </div>

      <label className="field field--inline">
        <IconTag size={15} />
        <span className="field__label">{t('opt.tags')}</span>
        <input
          className="input"
          value={options.tags}
          placeholder={t('opt.tagsPlaceholder')}
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => onChange({ tags: e.target.value })}
        />
      </label>

      <label className="checkbox" title={t('opt.uniqueTitle')}>
        <input
          type="checkbox"
          checked={options.useUniqueFileName}
          disabled={disabled}
          onChange={(e) => onChange({ useUniqueFileName: e.target.checked })}
        />
        <span>{t('opt.unique')}</span>
      </label>

      <label className="field field--inline field--narrow" title={t('opt.concurrencyTitle')}>
        <span className="field__label">{t('opt.concurrency')}</span>
        <input
          className="input input--number"
          type="number"
          min={1}
          max={8}
          value={concurrency}
          disabled={disabled}
          onChange={(e) => onConcurrencyChange(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
