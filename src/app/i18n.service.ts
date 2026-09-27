import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'th' | 'zh';

const STORAGE_KEY = 'app_lang';
const VALID_LANGS: Lang[] = ['en', 'th', 'zh'];

@Injectable({ providedIn: 'root' })
export class I18nService {
  private translations: Record<string, string> = {};

  /** Currently active language. Components can read this as a signal. */
  readonly lang = signal<Lang>('en');

  /** Returns the language persisted in localStorage, or 'en' as fallback. */
  getSavedLang(): Lang {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_LANGS.includes(saved as Lang) ? (saved as Lang) : 'en';
  }

  /** Load the JSON file for the given language, activate it, and persist to localStorage. */
  async setLang(lang: Lang): Promise<void> {
    const data = await fetch(`assets/i18n/${lang}.json`).then(r => r.json());
    this.translations = data;
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  /**
   * Translate a key, with optional `{{placeholder}}` interpolation.
   * Usage:  t('tasksRemaining', { count: 3 })
   */
  t(key: string, params?: Record<string, string | number>): string {
    let value = this.translations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, String(v));
      }
    }
    return value;
  }
}
