import type { AppInfo } from '@shared/types'
import type { ThemeMode } from '../lib/theme'
import { cn } from '../lib/utils'
import { IconMoon, IconSettings, IconSun } from './Icons'

interface HeaderProps {
  name: string
  appInfo: AppInfo | null
  themeMode: ThemeMode
  onCycleTheme: () => void
  onOpenSettings: () => void
}

const THEME_LABEL: Record<ThemeMode, string> = {
  dark: '深色',
  light: '浅色',
  system: '跟随系统'
}

export function Header({ name, appInfo, themeMode, onCycleTheme, onOpenSettings }: HeaderProps) {
  const isMac = appInfo?.platform === 'darwin'
  const configured = appInfo?.configured ?? false

  return (
    <header className={cn('app-header', isMac && 'app-header--mac')}>
      <div className="app-header__brand">
        <span className="brand-mark" aria-hidden="true">
          IK
        </span>
        <div className="brand-text">
          <h1 title={name}>{name}</h1>
          <p>
            ImageKit 上传工具
            {appInfo ? ` · v${appInfo.version}` : ''}
          </p>
        </div>
      </div>

      <div className="app-header__actions">
        <span className={cn('pill', configured ? 'pill--ok' : 'pill--warn')}>
          <i className="dot" />
          {configured ? '凭证已配置' : '待配置凭证'}
        </span>

        <button
          type="button"
          className="icon-btn"
          onClick={onCycleTheme}
          title={`主题：${THEME_LABEL[themeMode]}（点击切换）`}
        >
          {themeMode === 'dark' ? <IconMoon size={17} /> : <IconSun size={17} />}
        </button>

        <button type="button" className="btn btn--ghost" onClick={onOpenSettings}>
          <IconSettings size={16} />
          设置
        </button>
      </div>
    </header>
  )
}
