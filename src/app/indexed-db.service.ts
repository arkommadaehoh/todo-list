import { Injectable } from '@angular/core';
import { Todo, Label } from './todo.model';

const DB_NAME     = 'todo-app-db';
const DB_VERSION  = 2;
const TODOS_STORE  = 'todos';
const LABELS_STORE = 'labels';

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private db: IDBDatabase | null = null;
  private openPromise: Promise<void> | null = null;

  /** Open (or create) the database. Safe to call multiple times — resolves immediately if already open. */
  open(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.openPromise) return this.openPromise;
    this.openPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TODOS_STORE)) {
          db.createObjectStore(TODOS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(LABELS_STORE)) {
          db.createObjectStore(LABELS_STORE, { keyPath: 'id' });
        }
      };

      req.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      req.onerror = (event) => {
        this.openPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
    return this.openPromise;
  }

  /** Load all todos from the store, in saved order (falls back to id for older records). */
  loadAll(): Promise<Todo[]> {
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(TODOS_STORE, 'readonly');
      const store = tx.objectStore(TODOS_STORE);
      const req   = store.getAll();

      req.onsuccess = () =>
        resolve((req.result as Todo[]).sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id)));
      req.onerror   = () => reject(req.error);
    });
  }

  /** Overwrite the entire todos store with the provided list (single transaction). */
  saveAll(todos: Todo[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(TODOS_STORE, 'readwrite');
      const store = tx.objectStore(TODOS_STORE);

      store.clear();
      todos.forEach((todo, order) => store.put({ ...todo, order }));

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  /** Load all labels. */
  loadAllLabels(): Promise<Label[]> {
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(LABELS_STORE, 'readonly');
      const store = tx.objectStore(LABELS_STORE);
      const req   = store.getAll();

      req.onsuccess = () => resolve(req.result as Label[]);
      req.onerror   = () => reject(req.error);
    });
  }

  /** Overwrite the entire labels store (single transaction). */
  saveAllLabels(labels: Label[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(LABELS_STORE, 'readwrite');
      const store = tx.objectStore(LABELS_STORE);

      store.clear();
      labels.forEach(label => store.put(label));

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
}
