import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { Todo, TodoStatus } from './todo.model';
import { IndexedDbService } from './indexed-db.service';
import { LabelStore } from './label.store';

interface TodoState {
  todos: Todo[];
  loaded: boolean;
  nextId: number;
}

const initialState: TodoState = { todos: [], loaded: false, nextId: 1 };

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withDevtools('todos'),
  withState(initialState),
  withComputed(({ todos }) => ({
    activeTodos:    computed(() => todos().filter(t => !t.completed)),
    completedTodos: computed(() => todos().filter(t => t.completed)),
  })),
  withMethods((store, db = inject(IndexedDbService), labelStore = inject(LabelStore)) => {
    const persist = (): void => {
      db.saveAll(store.todos()).catch(err =>
        console.error('[TodoStore] IndexedDB save failed:', err)
      );
    };

    return {
      /** Called once by APP_INITIALIZER before the app renders. */
      async init(): Promise<void> {
        await db.open();
        await labelStore.init();
        const saved = await db.loadAll();
        if (saved.length > 0) {
          updateState(store, 'init',
          {
            nextId: Math.max(...saved.map(t => t.id)) + 1,
            // Migrate todos saved before `status` existed.
            todos: saved.map(t => ({
              ...t,
              status: t.status ?? (t.completed ? 'done' : 'todo')
            })),
          });
        }
        updateState(store, 'init loaded', { loaded: true });
      },

      add(title: string, dueDate: string | null = null, labelIds: number[] = []): void {
        if (!title.trim()) return;
        updateState(store, 'add', state => ({
          nextId: state.nextId + 1,
          todos: [
            ...state.todos,
            { id: state.nextId, title: title.trim(), dueDate, completed: false, status: 'todo' as TodoStatus, labelIds }
          ],
        }));
        persist();
      },

      update(id: number, changes: Partial<Pick<Todo, 'title' | 'description' | 'dueDate' | 'completed' | 'labelIds'>>): void {
        updateState(store, 'update', state => ({
          todos: state.todos.map(t => {
            if (t.id !== id) return t;
            const next = { ...t, ...changes };
            if (changes.completed !== undefined) {
              next.status = changes.completed ? 'done' : (t.status === 'done' ? 'todo' : t.status);
            }
            return next;
          }),
        }));
        persist();
      },

      setStatus(id: number, status: TodoStatus): void {
        updateState(store, 'setStatus', state => ({
          todos: state.todos.map(t => (t.id === id ? { ...t, status, completed: status === 'done' } : t)),
        }));
        persist();
      },

      /**
       * Reorder: place `id` before/after `targetId` (or at the end when `targetId` is null).
       * Optionally moves it to another status at the same time.
       */
      move(id: number, targetId: number | null, after: boolean, status?: TodoStatus): void {
        if (id === targetId) return;
        const item = store.todos().find(t => t.id === id);
        if (!item) return;
        const rest = store.todos().filter(t => t.id !== id);
        const at = targetId === null ? rest.length : rest.findIndex(t => t.id === targetId);
        if (at < 0) return;
        const moved: Todo = status ? { ...item, status, completed: status === 'done' } : item;
        const index = targetId === null ? at : at + (after ? 1 : 0);
        updateState(store, 'move', { todos: [...rest.slice(0, index), moved, ...rest.slice(index)] });
        persist();
      },

      remove(id: number): void {
        updateState(store, 'remove', state => ({ todos: state.todos.filter(t => t.id !== id) }));
        persist();
      },

      toggleComplete(id: number): void {
        updateState(store, 'toggleComplete', state => ({
          todos: state.todos.map(t => {
            if (t.id !== id) return t;
            const completed = !t.completed;
            return { ...t, completed, status: (completed ? 'done' : 'todo') as TodoStatus };
          }),
        }));
        persist();
      },
    };
  })
);
