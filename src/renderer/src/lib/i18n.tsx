import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  DEFAULT_LANGUAGE,
  createTranslator,
  localeOf,
  type Language,
  type TranslateFn
} from '@shared/i18n'

interface I18nValue {
  lang: Language
  t: TranslateFn
  /** 当前语言对应的排序 locale */
  locale: string
}

const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LANGUAGE,
  t: createTranslator(DEFAULT_LANGUAGE),
  locale: localeOf(DEFAULT_LANGUAGE)
})

/** 语言上下文：由 App 提供，界面语言来自 config.json 的 language 字段 */
export function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({ lang, t: createTranslator(lang), locale: localeOf(lang) }),
    [lang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** 取当前语言的翻译函数与语言代码 */
export function useI18n(): I18nValue {
  return useContext(I18nContext)
}

/** 只要翻译函数时的简写 */
export function useT(): TranslateFn {
  return useContext(I18nContext).t
}
