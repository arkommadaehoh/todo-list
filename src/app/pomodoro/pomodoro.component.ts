import { Component, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

@Component({
  selector: 'app-pomodoro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pomodoro.component.html',
  styleUrls: ['./pomodoro.component.scss']
})
export class PomodoroComponent implements OnDestroy {
  // Mode settings (in minutes)
  workDuration = signal(25);
  shortBreakDuration = signal(5);
  longBreakDuration = signal(15);

  currentMode = signal<PomodoroMode>('work');
  isRunning = signal(false);

  // Time remaining in seconds
  timeLeft = signal(25 * 60);

  // Stats
  completedSessions = signal(0);

  // Settings modal / edit mode toggle
  showSettings = signal(false);
  tempWork = 25;
  tempShortBreak = 5;
  tempLongBreak = 15;

  private timerInterval: any = null;
  private audioCtx: AudioContext | null = null;

  readonly modeTitle = computed(() => {
    switch (this.currentMode()) {
      case 'work': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
    }
  });

  readonly formattedTime = computed(() => {
    const total = this.timeLeft();
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
    let currentMins = 25;
    if (current === 'work') {
      const next = Math.max(1, Math.min(120, this.workDuration() + delta));
      this.workDuration.set(next);
      currentMins = next;
    } else if (current === 'shortBreak') {
      const next = Math.max(1, Math.min(60, this.shortBreakDuration() + delta));
      this.shortBreakDuration.set(next);
      currentMins = next;
    } else {
      const next = Math.max(1, Math.min(60, this.longBreakDuration() + delta));
      this.longBreakDuration.set(next);
      currentMins = next;
    }

    if (!this.isRunning()) {
      this.timeLeft.set(currentMins * 60);
    }
  }

  openSettings(): void {
    this.tempWork = this.workDuration();
    this.tempShortBreak = this.shortBreakDuration();
    this.tempLongBreak = this.longBreakDuration();
    this.showSettings.set(true);
  }

  saveSettings(): void {
    const w = Math.max(1, Math.min(120, Number(this.tempWork) || 25));
    const sb = Math.max(1, Math.min(60, Number(this.tempShortBreak) || 5));
    const lb = Math.max(1, Math.min(60, Number(this.tempLongBreak) || 15));

    this.workDuration.set(w);
    this.shortBreakDuration.set(sb);
    this.longBreakDuration.set(lb);
    this.showSettings.set(false);

    if (!this.isRunning()) {
      this.timeLeft.set(this.getTotalSecondsForMode(this.currentMode()));
    }
  }

  cancelSettings(): void {
    this.showSettings.set(false);
  }

  private getTotalSecondsForMode(mode: PomodoroMode): number {
    switch (mode) {
      case 'work': return this.workDuration() * 60;
      case 'shortBreak': return this.shortBreakDuration() * 60;
      case 'longBreak': return this.longBreakDuration() * 60;
    }
  }

  private onTimerComplete(): void {
    this.playNotificationSound();

    if (this.currentMode() === 'work') {
      this.completedSessions.update(c => c + 1);
      const nextMode = this.completedSessions() % 4 === 0 ? 'longBreak' : 'shortBreak';
      setTimeout(() => {
        alert(`🎉 Focus session complete! Time for a ${nextMode === 'longBreak' ? 'long' : 'short'} break.`);
        this.setMode(nextMode);
      }, 300);
    } else {
      setTimeout(() => {
        alert('⏰ Break finished! Ready to get back to focus?');
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

      // Play 3 melodic bell chime tones: C5, E5, G5
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.001, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.7);
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
