import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TodoStore } from './todo.store';
import { I18nStore } from './i18n.store';
import { routes } from './app.routes';

function initApp(todoService: InstanceType<typeof TodoStore>, i18n: InstanceType<typeof I18nStore>): () => Promise<void> {
  return async () => {
    await Promise.all([todoService.init(), i18n.setLang(i18n.getSavedLang())]);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [TodoStore, I18nStore],
      multi: true,
    },
  ],
};
