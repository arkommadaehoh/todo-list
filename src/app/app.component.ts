import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TodoService } from './todo.service';
import { I18nService, Lang } from './i18n.service';
import { Todo } from './todo.model';
import { CalendarComponent } from './calendar.component';
import { DatePickerComponent } from './date-picker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalendarComponent, DatePickerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly todoService = inject(TodoService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  // Top-level tab
  activeTab: 'todos' | 'calendar' | 'pomodoro' = 'todos';

  constructor() {
    this.syncTabWithUrl(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.syncTabWithUrl(event.urlAfterRedirects || event.url);
      });
  }

  private syncTabWithUrl(url: string): void {
    if (url.includes('/pomodoro')) {
      this.activeTab = 'pomodoro';
    } else if (this.activeTab === 'pomodoro') {
      this.activeTab = 'todos';
    }
  }

  switchTab(tab: 'todos' | 'calendar' | 'pomodoro'): void {
    this.activeTab = tab;
    if (tab === 'pomodoro') {
      this.router.navigate(['/pomodoro']);
    } else if (this.router.url.includes('/pomodoro')) {
      this.router.navigate(['/']);
    }
  }

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  // Add form state — newDueDate stored as YYYY-MM-DD (picker value)
  newTitle = '';
  newDueDate = this.todayStr();

  // Edit state
  editingId = signal<number | null>(null);
  editTitle = '';
  editDueDate = '';

  // Filter
  filter: 'all' | 'active' | 'completed' = 'all';

  get filteredTodos(): Todo[] {
    switch (this.filter) {
      case 'active':    return this.todoService.activeTodos();
      case 'completed': return this.todoService.completedTodos();
      default:          return this.todoService.todos();
    }
  }

  addTodo(): void {
    if (!this.newTitle.trim()) return;
    this.todoService.add(this.newTitle, this.newDueDate || null);
    this.newTitle = '';
    this.newDueDate = this.todayStr();
  }

  startEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editTitle = todo.title;
    this.editDueDate = todo.dueDate ?? '';
  }

  saveEdit(id: number): void {
    if (!this.editTitle.trim()) return;
    this.todoService.update(id, {
      title: this.editTitle.trim(),
      dueDate: this.editDueDate || null
    });
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle = '';
    this.editDueDate = '';
  }

  removeTodo(id: number): void {
    if (!confirm(this.i18n.t('confirmDelete'))) return;
    this.todoService.remove(id);
    if (this.editingId() === id) this.cancelEdit();
  }

  toggleComplete(id: number): void {
    this.todoService.toggleComplete(id);
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  }

  isDueToday(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return dueDate === this.todayStr();
  }

  clearCompleted(): void {
    if (!confirm(this.i18n.t('confirmClearCompleted'))) return;
    this.todoService.completedTodos().forEach(t => this.todoService.remove(t.id));
  }

  trackById(_: number, todo: Todo): number {
    return todo.id;
  }

  /** Display: 'YYYY-MM-DD' → 'dd/mm/yyyy' */
  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  private todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
