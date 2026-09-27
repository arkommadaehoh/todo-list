import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'pomodoro',
    loadChildren: () => import('./pomodoro/pomodoro.module').then(m => m.PomodoroModule)
  }
];
