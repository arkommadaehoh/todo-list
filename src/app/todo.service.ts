import { Injectable, signal, computed } from '@angular/core';
import { Todo } from './todo.model';
import { IndexedDbService } from './indexed-db.service';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private db       = new IndexedDbService();
  private nextId   = 1;
  private _todos   = signal<Todo[]>([]);
  private _loaded  = signal(false);

  readonly todos        = this._todos.asReadonly();
  readonly loaded       = this._loaded.asReadonly();
  readonly activeTodos  = computed(() => this._todos().filter(t => !t.completed));
  readonly completedTodos = computed(() => this._todos().filter(t => t.completed));

  /** Called once by APP_INITIALIZER before the app renders. */
  async init(): Promise<void> {
    await this.db.open();
    const saved = await this.db.loadAll();
    if (saved.length > 0) {
      this.nextId = Math.max(...saved.map(t => t.id)) + 1;
      this._todos.set(saved);
    }
    this._loaded.set(true);
  }

  add(title: string, dueDate: string | null = null): void {
    if (!title.trim()) return;
    this._todos.update(list => [
      ...list,
      { id: this.nextId++, title: title.trim(), dueDate, completed: false }
    ]);
    this.persist();
  }

  update(id: number, changes: Partial<Pick<Todo, 'title' | 'dueDate' | 'completed'>>): void {
    this._todos.update(list =>
      list.map(t => (t.id === id ? { ...t, ...changes } : t))
    );
    this.persist();
  }

  remove(id: number): void {
    this._todos.update(list => list.filter(t => t.id !== id));
    this.persist();
  }

  toggleComplete(id: number): void {
    this._todos.update(list =>
      list.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    this.persist();
  }

  private persist(): void {
    this.db.saveAll(this._todos()).catch(err =>
      console.error('[TodoService] IndexedDB save failed:', err)
    );
  }
}
