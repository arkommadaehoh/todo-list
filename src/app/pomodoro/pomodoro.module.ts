import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { PomodoroComponent } from './pomodoro.component';

const routes: Routes = [
  { path: '', component: PomodoroComponent }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    PomodoroComponent,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class PomodoroModule {}
