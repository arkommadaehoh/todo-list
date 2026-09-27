import { Injectable } from '@angular/core';
import { Todo } from './todo.model';

const DB_NAME    = 'todo-app-db';
const DB_VERSION = 1;
const STORE_NAME = 'todos';

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private db: IDBDatabase | null = null;

  /** Open (or create) the database. Must be awaited before any read/write. */
  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      req.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      req.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /** Load all todos from the store, ordered by id. */
  loadAll(): Promise<Todo[]> {
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.getAll();

      req.onsuccess = () =>
        resolve((req.result as Todo[]).sort((a, b) => a.id - b.id));
      req.onerror   = () => reject(req.error);
    });
  }

  /** Overwrite the entire store with the provided list (single transaction). */
  saveAll(todos: Todo[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear();
      for (const todo of todos) {
        store.put(todo);
      }

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
}
