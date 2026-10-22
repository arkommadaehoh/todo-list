import { signalStore, withMethods, withState } from '@ngrx/signals';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';

export type Lang = 'en' | 'th' | 'zh';

const STORAGE_KEY = 'app_lang';
const VALID_LANGS: Lang[] = ['en', 'th', 'zh'];

interface I18nState {
  /** Currently active language. */
  lang: Lang;
}

const initialState: I18nState = { lang: 'en' };

export const I18nStore = signalStore(
  { providedIn: 'root' },
  withDevtools('i18n'),
  withState(initialState),
  withMethods(store => {
    /** Texts of the active language only; kept out of state so DevTools stays small. */
    let translations: Record<string, string> = {};

    return {
      /** Returns the language persisted in localStorage, or 'en' as fallback. */
      getSavedLang(): Lang {
        const saved = localStorage.getItem(STORAGE_KEY);
        return VALID_LANGS.includes(saved as Lang) ? (saved as Lang) : 'en';
      },

      /** Load the JSON file for the given language, activate it, and persist to localStorage. */
      async setLang(lang: Lang): Promise<void> {
        translations = await fetch(`assets/i18n/${lang}.json`).then(r => r.json());
        updateState(store, `setLang ${lang}`, { lang });
        localStorage.setItem(STORAGE_KEY, lang);
      },

      /**
       * Translate a key, with optional `{{placeholder}}` interpolation.
       * Usage:  t('tasksRemaining', { count: 3 })
       */
      t(key: string, params?: Record<string, string | number>): string {
        store.lang(); // track the signal so views re-render when the language changes
        let value = translations[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            value = value.replace(`{{${k}}}`, String(v));
          }
        }
        return value;
      },
    };
  })
);
