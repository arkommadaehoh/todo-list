import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TodoService } from './todo.service';
import { I18nService } from './i18n.service';
import { routes } from './app.routes';

function initApp(todoService: TodoService, i18n: I18nService): () => Promise<void> {
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
      deps: [TodoService, I18nService],
      multi: true,
    },
  ],
};
