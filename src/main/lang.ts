import {
  DEFAULT_LANGUAGE,
  createTranslator,
  localeOf,
  type Language,
  type TranslateFn
} from '@shared/i18n'

/**
 * 主进程当前的界面语言。
 *
 * 主进程产生的报错、系统弹窗标题、连通性测试结果都会直接显示给用户，
 * 因此也需要跟着配置里的 `language` 走。语言在 `loadConfig()` 时同步进来
 * （见 `config.ts` 的 `normalize()`），这里只保留最新值。
 */
let current: Language = DEFAULT_LANGUAGE

/** 由配置模块在每次读取/保存配置时调用 */
export function setMainLanguage(lang: Language): void {
  current = lang
}

/** 当前语言 */
export function getMainLanguage(): Language {
  return current
}

/** 主进程侧的翻译函数（每次调用都会读取最新语言） */
export const mainT: TranslateFn = (key, params) => createTranslator(current)(key, params)

/** 主进程侧的名称排序 locale */
export function mainLocale(): string {
  return localeOf(current)
}
