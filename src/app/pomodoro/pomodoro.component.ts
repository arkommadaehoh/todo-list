import { Component, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nStore } from '../i18n.store';
import { PomodoroSettingsStore } from './pomodoro-settings.store';
import { signal } from '@angular/core';

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

@Component({
  selector: 'app-pomodoro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pomodoro.component.html',
  styleUrls: ['./pomodoro.component.scss']
})
export class PomodoroComponent implements OnDestroy {
  readonly i18n     = inject(I18nStore);
  readonly pomSettings = inject(PomodoroSettingsStore);

  /**
   * Reactive translation lookup. Reads i18n.lang() so Angular tracks it as
   * a signal dependency — the template re-renders whenever the language changes.
   */
  readonly texts = computed(() => {
    this.i18n.lang();
    return {
      pomWork:              this.i18n.t('pomWork'),
      pomShortBreak:        this.i18n.t('pomShortBreak'),
      pomLongBreak:         this.i18n.t('pomLongBreak'),
      pomStart:             this.i18n.t('pomStart'),
      pomPause:             this.i18n.t('pomPause'),
      pomReset:             this.i18n.t('pomReset'),
      pomTestSound:         this.i18n.t('pomTestSound'),
      pomCompletedSessions: this.i18n.t('pomCompletedSessions'),
    };
  });

  currentMode = signal<PomodoroMode>('work');
  isRunning   = signal(false);

  // Time remaining in seconds — seeded from the store's current work duration
  timeLeft = signal(0);

  completedSessions = signal(0);

  private timerInterval: any = null;
  private audioCtx: AudioContext | null = null;
  private initialized = false;

  constructor() {
    // Seed timeLeft once the store is available
    this.timeLeft.set(this.pomSettings.workDuration() * 60);
  }

  readonly modeTitle = computed(() => {
    this.i18n.lang();
    const map: Record<PomodoroMode, string> = {
      work:       'pomModeWork',
      shortBreak: 'pomModeShortBreak',
      longBreak:  'pomModeLongBreak',
    };
    return this.i18n.t(map[this.currentMode()]);
  });

  readonly formattedTime = computed(() => {
    const total   = this.timeLeft();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  readonly progress = computed(() => {
    const totalSec = this.getTotalSecondsForMode(this.currentMode());
    if (totalSec <= 0) return 0;
    return Math.max(0, Math.min(100, ((totalSec - this.timeLeft()) / totalSec) * 100));
  });

  setMode(mode: PomodoroMode): void {
    this.pauseTimer();
    this.currentMode.set(mode);
    this.timeLeft.set(this.getTotalSecondsForMode(mode));
  }

  toggleTimer(): void {
    if (this.isRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer(): void {
    if (this.isRunning()) return;
    this.isRunning.set(true);

    this.timerInterval = setInterval(() => {
      const remaining = this.timeLeft() - 1;
      if (remaining <= 0) {
        this.timeLeft.set(0);
        this.pauseTimer();
        this.onTimerComplete();
      } else {
        this.timeLeft.set(remaining);
      }
    }, 1000);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer(): void {
    this.pauseTimer();
    this.timeLeft.set(this.getTotalSecondsForMode(this.currentMode()));
  }

  adjustMinutes(delta: number): void {
    const current = this.currentMode();
    if (current === 'work') {
      const next = Math.max(1, Math.min(120, this.pomSettings.workDuration() + delta));
      this.pomSettings.setWorkDuration(next);
    } else if (current === 'shortBreak') {
      const next = Math.max(1, Math.min(60, this.pomSettings.shortBreakDuration() + delta));
      this.pomSettings.setShortBreakDuration(next);
    } else {
      const next = Math.max(1, Math.min(60, this.pomSettings.longBreakDuration() + delta));
      this.pomSettings.setLongBreakDuration(next);
    }

    if (!this.isRunning()) {
      this.timeLeft.set(this.getTotalSecondsForMode(current));
    }
  }

  private getTotalSecondsForMode(mode: PomodoroMode): number {
    switch (mode) {
      case 'work':       return this.pomSettings.workDuration()       * 60;
      case 'shortBreak': return this.pomSettings.shortBreakDuration() * 60;
      case 'longBreak':  return this.pomSettings.longBreakDuration()  * 60;
    }
  }

  private onTimerComplete(): void {
    this.playNotificationSound();

    if (this.currentMode() === 'work') {
      this.completedSessions.update(c => c + 1);
      const nextMode = this.completedSessions() % 4 === 0 ? 'longBreak' : 'shortBreak';
      setTimeout(() => {
        const breakLabel = this.i18n.t(nextMode === 'longBreak' ? 'pomBreakLong' : 'pomBreakShort');
        alert(this.i18n.t('pomAlertFocusDone', { break: breakLabel }));
        this.setMode(nextMode);
      }, 300);
    } else {
      setTimeout(() => {
        alert(this.i18n.t('pomAlertBreakDone'));
        this.setMode('work');
      }, 300);
    }
  }

  /** Synthesize pleasant chime using Web Audio API */
  playNotificationSound(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Play 4 melodic bell chime tones: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.001, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.3,     now + idx * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001,  now + idx * 0.15 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now  + idx * 0.15 + 0.7);
      });
    } catch (e) {
      console.warn('Audio playback failed', e);
    }
  }

  ngOnDestroy(): void {
    this.pauseTimer();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
