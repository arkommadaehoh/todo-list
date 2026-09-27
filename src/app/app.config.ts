import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { TodoService } from './todo.service';

function initTodos(todoService: TodoService): () => Promise<void> {
  return () => todoService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initTodos,
      deps: [TodoService],
      multi: true,
    },
  ],
};
