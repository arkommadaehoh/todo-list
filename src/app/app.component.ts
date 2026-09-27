import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';
import { Todo } from './todo.model';
import { CalendarComponent } from './calendar.component';
import { DatePickerComponent } from './date-picker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent, DatePickerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly todoService = inject(TodoService);

  // Top-level tab
  activeTab: 'todos' | 'calendar' = 'todos';

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
    if (!confirm('Are you sure you want to delete this task?')) return;
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
    if (!confirm('Are you sure you want to clear all completed tasks?')) return;
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
