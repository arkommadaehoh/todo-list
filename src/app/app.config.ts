import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TodoService } from './todo.service';
import { routes } from './app.routes';

function initTodos(todoService: TodoService): () => Promise<void> {
  return () => todoService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initTodos,
      deps: [TodoService],
      multi: true,
    },
  ],
};
