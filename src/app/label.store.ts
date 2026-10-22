import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { Label } from './todo.model';
import { IndexedDbService } from './indexed-db.service';

/** Preset palette for quick color selection */
export const LABEL_COLORS: string[] = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6b7280', // gray
];

interface LabelState {
  labels: Label[];
  loaded: boolean;
  nextId: number;
}

const initialState: LabelState = { labels: [], loaded: false, nextId: 1 };

export const LabelStore = signalStore(
  { providedIn: 'root' },
  withDevtools('labels'),
  withState(initialState),
  withComputed(({ labels }) => ({
    labelMap: computed(() => {
      const map = new Map<number, Label>();
      labels().forEach(l => map.set(l.id, l));
      return map;
    }),
  })),
  withMethods((store, db = inject(IndexedDbService)) => {
    const persist = (): void => {
      db.saveAllLabels(store.labels()).catch(err =>
        console.error('[LabelStore] IndexedDB save failed:', err)
      );
    };

    return {
      async init(): Promise<void> {
        await db.open();
        const saved = await db.loadAllLabels();
        updateState(store, 'init', {
          labels: saved,
          nextId: saved.length > 0 ? Math.max(...saved.map(l => l.id)) + 1 : 1,
          loaded: true,
        });
      },

      addLabel(text: string, color: string): void {
        if (!text.trim()) return;
        updateState(store, 'addLabel', state => ({
          nextId: state.nextId + 1,
          labels: [...state.labels, { id: state.nextId, text: text.trim(), color }],
        }));
        persist();
      },

      renameLabel(id: number, text: string): void {
        if (!text.trim()) return;
        updateState(store, 'renameLabel', state => ({
          labels: state.labels.map(l => l.id === id ? { ...l, text: text.trim() } : l),
        }));
        persist();
      },

      recolorLabel(id: number, color: string): void {
        updateState(store, 'recolorLabel', state => ({
          labels: state.labels.map(l => l.id === id ? { ...l, color } : l),
        }));
        persist();
      },

      removeLabel(id: number): void {
        updateState(store, 'removeLabel', state => ({
          labels: state.labels.filter(l => l.id !== id),
        }));
        persist();
      },
    };
  })
);
