import { LANGUAGE_LABELS, type Language } from '@shared/i18n'
import type { AppInfo } from '@shared/types'
import { useI18n } from '../lib/i18n'
import type { ThemeMode } from '../lib/theme'
import { cn } from '../lib/utils'
import { IconMoon, IconSettings, IconSun } from './Icons'

interface HeaderProps {
  name: string
  appInfo: AppInfo | null
  themeMode: ThemeMode
  lang: Language
  onCycleTheme: () => void
  onToggleLanguage: () => void
  onOpenSettings: () => void
}

export function Header({
  name,
  appInfo,
  themeMode,
  lang,
  onCycleTheme,
  onToggleLanguage,
  onOpenSettings
}: HeaderProps) {
  const { t } = useI18n()
  const isMac = appInfo?.platform === 'darwin'
  const configured = appInfo?.configured ?? false
  const nextLang: Language = lang === 'en' ? 'zh' : 'en'

  return (
    <header className={cn('app-header', isMac && 'app-header--mac')}>
      <div className="app-header__brand">
        <span className="brand-mark" aria-hidden="true">
          IK
        </span>
        <div className="brand-text">
          <h1 title={name}>{name}</h1>
          <p>
            {t('app.subtitle')}
            {appInfo ? ` · v${appInfo.version}` : ''}
          </p>
        </div>
      </div>

      <div className="app-header__actions">
        <span className={cn('pill', configured ? 'pill--ok' : 'pill--warn')}>
          <i className="dot" />
          {configured ? t('app.credentialsReady') : t('app.credentialsMissing')}
        </span>

        <button
          type="button"
          className="lang-btn"
          onClick={onToggleLanguage}
          title={t('language.tooltip', { language: LANGUAGE_LABELS[nextLang] })}
        >
          {LANGUAGE_LABELS[lang]}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onCycleTheme}
          title={t('theme.tooltip', { theme: t(`theme.${themeMode}`) })}
        >
          {themeMode === 'dark' ? <IconMoon size={17} /> : <IconSun size={17} />}
        </button>

        <button type="button" className="btn btn--ghost" onClick={onOpenSettings}>
          <IconSettings size={16} />
          {t('app.settings')}
        </button>
      </div>
    </header>
  )
}
