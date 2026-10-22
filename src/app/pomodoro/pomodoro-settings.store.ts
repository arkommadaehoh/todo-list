import { signalStore, withMethods, withState } from '@ngrx/signals';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';

const STORAGE_KEY = 'pomodoro_settings';

interface PomodoroSettingsState {
  workDuration:       number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration:  number; // minutes
}

const defaults: PomodoroSettingsState = {
  workDuration:       25,
  shortBreakDuration: 5,
  longBreakDuration:  15,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function loadFromStorage(): PomodoroSettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return {
      workDuration:       clamp(Number(parsed.workDuration)       || defaults.workDuration,       1, 120),
      shortBreakDuration: clamp(Number(parsed.shortBreakDuration) || defaults.shortBreakDuration, 1,  60),
      longBreakDuration:  clamp(Number(parsed.longBreakDuration)  || defaults.longBreakDuration,  1,  60),
    };
  } catch {
    return { ...defaults };
  }
}

function saveToStorage(state: PomodoroSettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota errors */ }
}

export const PomodoroSettingsStore = signalStore(
  { providedIn: 'root' },
  withDevtools('pomodoroSettings'),
  withState<PomodoroSettingsState>(loadFromStorage()),
  withMethods(store => ({
    setWorkDuration(minutes: number): void {
      const value = clamp(Math.round(Number(minutes) || defaults.workDuration), 1, 120);
      updateState(store, 'setWorkDuration', { workDuration: value });
      saveToStorage({ workDuration: value, shortBreakDuration: store.shortBreakDuration(), longBreakDuration: store.longBreakDuration() });
    },
    setShortBreakDuration(minutes: number): void {
      const value = clamp(Math.round(Number(minutes) || defaults.shortBreakDuration), 1, 60);
      updateState(store, 'setShortBreakDuration', { shortBreakDuration: value });
      saveToStorage({ workDuration: store.workDuration(), shortBreakDuration: value, longBreakDuration: store.longBreakDuration() });
    },
    setLongBreakDuration(minutes: number): void {
      const value = clamp(Math.round(Number(minutes) || defaults.longBreakDuration), 1, 60);
      updateState(store, 'setLongBreakDuration', { longBreakDuration: value });
      saveToStorage({ workDuration: store.workDuration(), shortBreakDuration: store.shortBreakDuration(), longBreakDuration: value });
    },
  }))
);
